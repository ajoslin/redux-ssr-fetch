var createActions = require('redux-nano').createActions

module.exports = createActions('REDUX_SSR_FETCH', {
  UPDATE_REQUEST_HEADERS: true,
  UPDATE_REQUEST_DEFAULTS: true,
  REQUEST: true,
  RECEIVE_RESPONSE: true
})
