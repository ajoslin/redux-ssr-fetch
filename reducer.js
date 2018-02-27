var createReducer = require('redux-nano').createReducer
var extend = require('xtend')
var delve = require('dlv')
var rl = require('redux-loop')
var actions = require('./actions')

var loop = rl.loop
var Cmd = rl.Cmd

module.exports = function createReduxSsrFetchReducer (initialState) {
  initialState = initialState || {}

  // At start of SSR, these are overriden with the client's req headers (cookies, IP, etc)
  // Any changes made to cookies or authorization during SSR are then applied to this object.
  initialState.headers = initialState.headers || {}

  // Other arbitrary options to pass to request functions.
  initialState.defaults = initialState.defaults || {}

  var handlers = {}
  handlers[actions.UPDATE_REQUEST_HEADERS] = function (state, action) {
    return extend(state, {
      headers: extend(state.headers, action.payload)
    })
  }
  handlers[actions.UPDATE_REQUEST_DEFAULTS] = function (state, action) {
    return extend(state, {
      defaults: extend(state.defaults, action.payload)
    })
  }
  handlers[actions.REQUEST] = function (state, action) {
    var method = action.payload.method
    var data = action.payload.data
    var successActionCreator = action.payload.successActionCreator
    var failActionCreator = action.payload.failActionCreator

    action.meta = action.meta || {}
    action.meta._requestData = data

    return loop(
      state,
      Cmd.run(runMethod, {
        successActionCreator: actions.RECEIVE_RESPONSE,
        failActionCreator: actions.RECEIVE_RESPONSE
      })
    )

    function runMethod () {
      return Promise.resolve(
        method(data, extend(state.defaults, {
          headers: extend(state.defaults ? state.defaults.headers : {}, state.headers)
        }))
      )
        .catch(function onClientSideError (error) {
          error = error || {}
          error.message = error.message || 'Unknown Error'
          return Promise.reject({
            response: {},
            body: error
          })
        })
        .then(function (response) {
          return Promise.resolve()
            .then(function () { return response.json() })
            .then(function (responseBody) {
              var data = { body: responseBody, raw: response }
              return response.ok ? data : Promise.reject(data)
            })
        })
        .then(responseData => ({
          response: responseData.raw,
          body: responseData.body,
          actionCreator: successActionCreator,
          meta: action.meta
        }))
        .catch(responseData => ({
          response: responseData.raw,
          body: responseData.body,
          actionCreator: failActionCreator,
          meta: action.meta
        }))
    }
  }

  handlers[actions.RECEIVE_RESPONSE] = function (state, action) {
    var actionCreator = action.payload.actionCreator
    var response = action.payload.response
    var body = action.payload.body
    var meta = action.payload.meta
    var isServer = typeof window === 'undefined'

    var newHeaders = isServer && {
      'set-cookie': delve(response, 'headers._headers.set-cookie'),
      authorization: delve(response, 'headers._headers.authorization')
    }

    return loop(
      state,
      Cmd.list([
        newHeaders && Cmd.action(actions.UPDATE_REQUEST_HEADERS(newHeaders)),
        actionCreator && Cmd.action(actionCreator(body || response, meta))
      ].filter(Boolean))
    )
  }

  return createReducer(initialState, handlers)
}
