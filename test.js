var test = require('tape')
var spok = require('spok')
var actions = require('./actions')
var createRequestReducer = require('./reducer')

var { createReducer } = require('redux-nano')
var { createStore, compose } = require('redux')
var { install, combineReducers } = require('redux-loop')

function Store ({ handlers } = {}) {
  return createStore(
    combineReducers({
      request: createRequestReducer(),
      custom: createReducer({}, handlers || {})
    }),
    {},
    compose(install())
  )
}

test('UPDATE_REQUEST_HEADERS', (t) => {
  var reducer = createRequestReducer()
  var state = reducer({}, actions.UPDATE_REQUEST_HEADERS({
    foo: 'bar'
  }))
  t.deepEqual(state.headers, {foo: 'bar'})
  t.end()
})

test('SERVER_SET_DEFAULTS', (t) => {
  var reducer = createRequestReducer()
  var state = reducer({}, actions.UPDATE_REQUEST_DEFAULTS({
    bar: 'baz'
  }))
  t.deepEqual(state.defaults, {bar: 'baz'})
  t.end()
})

test('state.headers and state.defaults passed to called methods', t => {
  var store = Store()

  store.dispatch(actions.UPDATE_REQUEST_HEADERS({ foo: 'bar' }))
  store.dispatch(actions.UPDATE_REQUEST_DEFAULTS({ locale: 'en-us' }))

  store.dispatch(actions.REQUEST({
    data: 1,
    method
  }))

  function method (data, opts) {
    t.deepEqual(opts, {
      locale: 'en-us',
      headers: { foo: 'bar' }
    })
    t.equal(data, 1)
    t.end()
  }
})

test('authorization and set-cookie are taken from fetch-formatted response', t => {
  var store = Store()
  store.dispatch(actions.UPDATE_REQUEST_HEADERS({
    preset: 'header'
  }))
  store.dispatch(actions.UPDATE_REQUEST_DEFAULTS({
    preset: 'default'
  }))
  store.dispatch(actions.REQUEST({
    data: 1,
    method
  }))

  function method (data, opts) {
    return Promise.resolve({
      // Use isomorphic-fetch server-side response format for headers
      ok: true,
      json: () => ({}),
      headers: {
        _headers: {
          'set-cookie': 'cookie',
          authorization: 'Bearer 456',
          something: 'else'
        }
      }
    })
  }

  setTimeout(() => {
    spok(t, store.getState().request, {
      headers: {
        preset: 'header',
        'set-cookie': 'cookie',
        authorization: 'Bearer 456'
      },
      defaults: {
        preset: 'default'
      }
    })
    t.end()
  }, 10)
})

test('successActionCreator', t => {
  t.plan(1)
  var store = Store({
    handlers: {
      'my_success': (state, action) => {
        t.deepEqual(action.payload, { some: 'response' })
        t.end()
      }
    }
  })

  store.dispatch(actions.REQUEST({
    method: () => ({
      ok: true,
      json: () => ({ some: 'response' })
    }),
    successActionCreator: json => {
      return { type: 'my_success', payload: json }
    }
  }))
})

test('failActionCreator', t => {
  t.plan(1)
  var store = Store({
    handlers: {
      'my_fail': (state, action) => {
        t.deepEqual(action.payload, { some: 'fail' })
        t.end()
      }
    }
  })

  store.dispatch(actions.REQUEST({
    method: () => ({
      ok: false,
      json: () => ({ some: 'fail' })
    }),
    failActionCreator: json => {
      return { type: 'my_fail', payload: json }
    }
  }))
})

test('REQUEST with immediate error', t => {
  const thrownError = new Error()
  var store = Store({
    handlers: {
      'my_fail': (state, action) => {
        t.equal(action.payload, thrownError)
        t.end()
      }
    }
  })
  store.dispatch(actions.REQUEST({
    method: () => {
      throw thrownError
    },
    failActionCreator: payload => ({ type: 'my_fail', payload })
  }))
})
