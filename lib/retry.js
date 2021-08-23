const retryable = require('async/retryable')

let retriesDefault = 5
if (process.env.NODE_ENV !== 'production') {
  retriesDefault = 1
}

const retry = (
  procedure,
  params,
  opts = {
    times: 5,
    interval: 100
  }
) => {
  return new Promise((resolve, reject) => {
    let i = 0

    const apiMethod = async (callback) => {
      if (i > 0) {
        console.warn(`Intento ${++i} de ${procedure.name}`, { params, opts })
      }
      try {
        const result = await procedure(params)
        callback(null, result)
      } catch (e) {
        callback(e)
      }
    }

    const londonCalling = retryable(opts, (callback) => apiMethod(callback))

    londonCalling((e, result) => {
      if (e) {
        return reject(e)
      }
      resolve(result)
    })
  })
}

module.exports = {
  retry: retry,
  retriesDefault: retriesDefault,
  // TODO: agregar config (pasar headers)
  retryPost: (url, data, opts, axios) => {
    const axiosPost = ({ url, data }) => {
      return axios
        .post(url, data)
        .then((response) => {
          // console.warn({ 'LOGGING response++++++++++++++++++': response })
          return response
        })
        .catch((error) => {
          // console.warn({ 'LOGGING error++++++++++++++++++++': error })
          throw error
        })
    }

    return retry(axiosPost, { url, data }, opts)
      .then((response) => response)
      .catch((error) => {
        throw error
      })
  },
  retryGet: (url, config, opts, axios) => {
    const axiosGet = ({ url, config }) => {
      // console.warn({ 'LOGGING config++++++++++++++++++++++': config })
      return axios
        .get(url, config)
        .then((response) => {
          // console.warn({ 'LOGGING response++++++++++++++++++': response })
          return response
        })
        .catch((error) => {
          // console.warn({ 'LOGGING error++++++++++++++++++++': error })
          throw error
        })
    }

    return retry(axiosGet, { url, config }, opts)
      .then((response) => response)
      .catch((error) => {
        throw error
      })
  }
}
