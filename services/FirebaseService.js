// eslint-disable-next-line no-unused-vars
const util = require('util')
const { adminFirebase } = require('../lib/support')
const { retry, retriesDefault } = require('../lib/retry')
const uuidv1 = require('uuid/v1')

function subscribeTopic({ tokens, topic }) {
  return adminFirebase
    .messaging()
    .subscribeToTopic(tokens, topic)
    .then((response) => {
      if (response.failureCount) {
        throw response.errors[0].error
      }
      // console.warn('Subscripción a tópico OK', { topic })
      return response
    })
    .catch((error) => {
      throw error
    })
}

function unsubscribeTopic({ tokens, topic }) {
  return adminFirebase
    .messaging()
    .unsubscribeFromTopic(tokens, topic)
    .then((response) => {
      if (response.failureCount) {
        throw response.errors[0].error
      }
      // console.warn('Desubscripción a tópico OK', { topic })
      return response
    })
    .catch((error) => {
      throw error
    })
}

/**
 * Para IOS y android ver
 * https://firebase.google.com/docs/cloud-messaging/concept-options.html#lifetime
 */
function publishToTopic(message) {
  // Lifespan of a message para web
  message.webpush = {
    headers: {
      TTL: '0' // "now or never"
    }
  }
  // return test!
  adminFirebase
    .messaging()
    .send(message)
    .then((response) => {
      // console.warn('Publicación a tópico OK', { message })
      return response
    })
    .catch((error) => {
      throw error
    })
}

function sendAll(messages) {
  // Solo enviar payloads efectivo
  const payload = messages.map((v) => v.payload)
  return adminFirebase
    .messaging()
    .sendAll(payload)
    .then((responses) => {
      if (responses.failureCount) {
        throw responses
      }
      // console.warn('responses', util.inspect(responses, null, 4))
      return responses
    })
    .catch((error) => {
      throw error
    })
}

function updateUser({ uid, email, name }) {
  return adminFirebase
    .auth()
    .updateUser(uid, {
      email: email,
      displayName: name
    })
    .then((userRecord) => {
      // console.warn('userRecord', util.inspect(userRecord, null, 4))
      return userRecord
    })
    .catch((error) => {
      throw error
    })
}

function updateClaimsUser({ uid, claimsObj }) {
  return adminFirebase
    .auth()
    .setCustomUserClaims(uid, claimsObj)
    .catch((error) => {
      throw error
    })
}

function createCustomToken(uid = uuidv1()) {
  return adminFirebase
    .auth()
    .createCustomToken(uid)
    .then((customToken) => customToken)
    .catch((error) => {
      throw error
    })
}

function getUserByEmail(email) {
  // console.warn('email', email)
  return adminFirebase
    .auth()
    .getUserByEmail(email)
    .then((userRecord) => userRecord)
    .catch((error) => {
      if (error.errorInfo.code === 'auth/user-not-found') {
      }
      throw error
    })
}

/**
 * Retry solo en:
 * 429 RESOURCE_EXHAUSTED ("quota exceeded")
 */
module.exports = {
  subscribeTopic: (tokens, topic) => {
    return new Promise((resolve, reject) => {
      retry(
        subscribeTopic,
        { tokens, topic },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  unsubscribeTopic: (tokens, topic) => {
    return new Promise((resolve, reject) => {
      retry(
        unsubscribeTopic,
        { tokens, topic },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  publishToTopic: (message) => {
    return new Promise((resolve, reject) => {
      retry(publishToTopic, message, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  sendAll: (messages) => {
    return new Promise((resolve, reject) => {
      retry(sendAll, messages, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  updateUser: (data) => {
    return new Promise((resolve, reject) => {
      retry(updateUser, data, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  updateClaimsUser: (data) => {
    return new Promise((resolve, reject) => {
      retry(updateClaimsUser, data, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  createCustomToken: (uid) => {
    return new Promise((resolve, reject) => {
      retry(createCustomToken, uid, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      retry(getUserByEmail, email, {
        times: retriesDefault,
        interval: 100
      })
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  }
}
