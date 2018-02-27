# redux-ssr-fetch [![Build Status](https://travis-ci.org/ajoslin/redux-ssr-fetch.svg?branch=master)](https://travis-ci.org/ajoslin/redux-ssr-fetch)

> An opinionated reducer for managing request lifecycle with Redux, with SSR in mind

## What and why?

Life is easy when you aren't doing server-side rendering. You can store the user's auth info globally in the browser, and just have your "make request" method get the user's auth info from some global state.

However, when doing server side rendering, *every* render has to have its own local copy of the requesting browser's request state.

Any authenticated requests must be made on the server have to pass up the currently rendered browser's headers with the request, so that the requests made during SSR can "pretend to" be from the browser requesting the render.

This means that for every render made on the server, the following lifecycle must happen.

- Request is made from browser requesting a server-side-render, headers are read
- React/redux app is booted up for the request
- The request headers are put into that app's redux store.
- The initial server-render is called, along with any authenticated requests. Those authenticated requests use the headers from the redux store.
- Any changed "significant" headers (cookies/authorization) from responses received on the server are placed in the redux store.
- After initial server-render is done, the updated significant headers (cookies/authorization) are retrieved from the redux store and set onto the browser response object.
- Finally, the response is sent to the browser.

## Install

```
$ npm install --save redux-ssr-fetch
```

## Usage

* **[redux-loop](https://npm.im/redux-loop) must be installed as reducer middleware!**
* Expects `fetch` to be used for all requests. Recommended: [isomorphic-unfetch](https://npm.im/isomorphic-unfetch)
*

```js
var ssrFetchReducer = require('redux-ssr-fetch/reducer')
var { REQUEST } = require('redux-ssr-fetch/actions')
var fetch = require('isomorphic-unfetch')

function myApiReducer (state, actions) {
  if (action.type === 'FETCH_PRODUCTS_SUCCESS') {
    return { ...state, products: action.payload }
  } else if (action.type === 'FETCH_PRODUCTS_ERROR') {
    return { ...state, error: action.payload }
  }
}

function getProducts (data, fetchOptions) {
  console.log(data) // => '123'
  return fetch('https://my.api/products', fetchOptions)
}

// ... somewhere
dispatch(REQUEST({
  method: getProducts,
  data: '123',
  successActionCreator: (responseData) => ({
    type: 'FETCH_PRODUCTS_SUCCESS',
    payload: responseData
  }),
  failActionCreator: (error) => ({
    type: 'FETCH_PRODUCTS_ERROR',
    payload: error
  })
}))
```

React Component:

```js
function ProductsComponent ({ products, error, getProducts }) {
  return <div>
    <button onClick={getProducts}>Get Products</button>
    <div>Error: {error && error.message}</div>
    <div>Products: {products && JSON.stringify(products)}</div>
  </div>
}

export default connect(state => ({
  products: state.products,
  error: state.error
}), dispatch => ({
  // This would live as an action in your reducer, ideally.
  getProducts: (data) => dispatch(REQUEST({
    method: getProducts,
    data,
    successActionCreator: (payload) => ({ type: 'FETCH_PRODUCTS_SUCCESS', payload }),
    failActionCreator: (payload) => ({ type: 'FETCH_PRODUCTS_ERROR', payload })
  }))
})
```

## API

Detailed Docs Coming Soon

## License

MIT © [Andrew Joslin](http://ajoslin.com)
