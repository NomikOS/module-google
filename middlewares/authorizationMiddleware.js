const asValue = require('awilix').asValue
const { adminFirebase } = require('../lib/support')
const moment = require('moment')
const { env } = require('../lib/env')
const url = require('url')

// To test 401
// logger.info(`TEST: Token expirado`)
// ctx.response.headers['x-kong-unauthorized'] = true
// ctx.response.headers['x-kong-message'] = 'Missing token or invalid.'
// ctx.status = 401

module.exports = async function authorizationMiddleware(ctx, next) {
  const logger = ctx.state.container.resolve('logger')

  if (!ctx.req.headers) {
    logger.info('No hay headers en request. Next.')
    return next()
  }

  if (env.NODE_ENV === 'test') {
    const userId = +ctx.req.headers['x-tracer-user-id']
    ctx.state.userId = userId
    ctx.state.container.register({
      userId: asValue(userId)
    })
    return next()
  }

  /* eslint-disable-next-line node/no-deprecated-api */
  const params = url.parse(ctx.req.url, true).query

  let token = ''

  if (params && params.idToken) {
    token = params.idToken
  } else {
    const authorization = ctx.req.headers.authorization
    if (!authorization) {
      logger.info('No hay headers.authorization en request. Next.')
      return next()
    }

    token = authorization.split(' ')[1]
  }

  if (!token) {
    logger.info('No hay token. Next.')
    return next()
  }

  logger.info('Si hay token. Analizar.')

  // Razones para no continuar upstream son muy pocas: 401
  let is401 = false

  await adminFirebase
    .auth()
    .verifyIdToken(token)
    .then((decodedToken) => {
      let userId
      if (decodedToken[`user:${env.NODE_ENV}:id`]) {
        userId = decodedToken[`user:${env.NODE_ENV}:id`]
      } else {
        logger.info(`No hay user:${env.NODE_ENV}:id`, { decodedToken })
        userId = null
      }

      // User found, seguir siguiente midleware en el flujo httpServer
      if (userId) {
        // tracers tomara userId en LoggerInstancer:setTracers
        // desde el siguiente ctx.req.headers
        // Resabio de cuando usaba kong y api-gateway: deprecar?
        ctx.req.headers['x-tracer-user-id'] = userId
        ctx.state.userId = userId
        ctx.state.container.register({
          userId: asValue(userId)
        })
        ctx.response.set({
          'x-kong-user-authenticated': true
        })
      } else {
        // Set headers para borrar este token inservible en el cliente
        ctx.response.set({
          'x-kong-user-not-found': true
        })
      }
    })
    .catch((error) => {
      logger.info(`Error verificando token porque: ${error.message}`)
      if (error.message && error.message.search(/id-token-expired/) > -1) {
        is401 = true
      }
    })

  if (is401) {
    // No seguir flujo down. Responder altiro con 401 para que cliente
    // regenere token

    const now = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
    const token2 = '...' + token.substr(token.length - 10)
    logger.info(`Token expirado: ${token2} a las ${now}`)

    ctx.response.set({
      'x-kong-unauthorized': true,
      'x-kong-message': 'Missing token or invalid.'
    })

    ctx.status = 401
    return
  }

  // Seguir upstream, upstream debe verificar si necesita
  // user autentificado
  return next()
}
