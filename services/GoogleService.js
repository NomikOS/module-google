const { pubsub, storage, secretManager, projectId } = require('../lib/support')
const { retry, retriesDefault } = require('../lib/retry')

function _pubsub({ queueName, payload }) {
  const data = JSON.stringify(payload)
  const dataBuffer = Buffer.from(data)
  return pubsub
    .topic(queueName)
    .publish(dataBuffer)
    .then((r) => {
      // console.warn('Encolamiento PubSub OK', { queueName, payload })
      return r
    })
    .catch((error) => {
      throw error
    })
}

function _storage({ bucketName, filename }) {
  // console.warn('Borrar', { bucketName, filename })
  return storage
    .bucket(bucketName)
    .file(filename)
    .delete()
    .then(() => {
      // console.warn(`gs://${bucketName}/${filename} deleted.`)
      return true
    })
    .catch((error) => {
      throw error
    })
}

function _storageBuffer({ bucketName, fullFileName, buffer }) {
  return new Promise((resolve, reject) => {
    const file = storage.bucket(bucketName).file(fullFileName)

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'application/vnd.ms-excel'
      }
    })

    stream.on('error', (err) => {
      // console.log({ err })
      reject(err)
    })

    stream.on('finish', () => {
      file.makePublic().then(() => {
        // console.log(`${fullFileName} ready`)
        resolve()
      })
    })

    stream.end(buffer)
  })
}

async function _secret({ secretId }) {
  const name = `projects/${projectId}/secrets/${secretId}/versions/latest`
  const [accessResponse] = await secretManager.accessSecretVersion({
    name: name
  })
  return accessResponse.payload.data.toString('utf8')
}

/**
 * Configurar variables env al crear service run* o mig
 * Usar update-secrets=/secrets/core-database-secret=$_ENV-core-database-secret:latest
 * en deploy de run
 */
function _connectDatabase({ knexPgConfig, databaseSecret }) {
  if (!knexPgConfig.connection) {
    throw new Error('DB connection data missing')
  }

  const config = { ...knexPgConfig }

  let host = config.connection.host

  if (config.connection.host === '-env-') {
    host = process.env.DB_HOST
    config.connection.host = process.env.DB_HOST
  }

  console.warn({ 'LOGGING config.connection.host': config.connection.host })

  if (config.connection.password === '-secret-') {
    if (!databaseSecret) {
      throw new Error('DB databaseSecret data missing')
    }

    config.connection = async () => {
      const password = await _secret({
        secretId: databaseSecret
      })

      console.warn({ 'LOGGING config.connection.password': 'usando secret' })

      const connectionConfig = {
        ...knexPgConfig.connection,
        host: host,
        password: password
      }

      console.warn({ 'LOGGING connectionConfig': connectionConfig })

      return connectionConfig
    }
  }

  return require('knex')(config)
}

module.exports = {
  pubsub: (queueName, payload) => {
    return new Promise((resolve, reject) => {
      retry(
        _pubsub,
        { queueName, payload },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  storage: (bucketName, filename) => {
    return new Promise((resolve, reject) => {
      retry(
        _storage,
        { bucketName, filename },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  storageBuffer: (bucketName, fullFileName, buffer) => {
    return new Promise((resolve, reject) => {
      retry(
        _storageBuffer,
        { bucketName, fullFileName, buffer },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },

  secret: (secretId) => {
    return new Promise((resolve, reject) => {
      retry(
        _secret,
        { secretId },
        {
          times: retriesDefault,
          interval: 100
        }
      )
        .then((response) => resolve(response))
        .catch((error) => reject(error))
    })
  },
  connectDatabase: ({ knexPgConfig, databaseSecret }) => {
    return _connectDatabase({ knexPgConfig, databaseSecret })
  }
}
