const { env } = require('./env')
const p = process.env.NODE_APP_PATH
const serviceAccount = require(`${p}/${env.googleServiceAccount}`)

const { PubSub } = require('@google-cloud/pubsub')
exports.pubsub = new PubSub({
  projectId: env.googleServiceAccount.project_id,
  keyFilename: env.googleServiceAccount
})

const { Storage } = require('@google-cloud/storage')
exports.storage = new Storage({
  keyFilename: env.googleServiceAccount
})

const adminFirebase = require('firebase-admin')

adminFirebase.initializeApp({
  projectId: env.googleServiceAccount.project_id,
  credential: adminFirebase.credential.cert(serviceAccount)
})

// Import the Secret Manager client and instantiate it:
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
exports.secretManager = new SecretManagerServiceClient()
exports.projectId = serviceAccount.project_id

exports.adminFirebase = adminFirebase
