'use strict'

import assert from 'assert'
import Methor from '../lib/methor'
import got from 'got'

describe('TEST Options', function() {
  it('methor.created', done => {
    new Methor({
      port: null,
      methods: {},
      created() {
        done()
      }
    })
  })
  it('methor.routes', done => {
    new Methor({
      port: null,
      methods: {},
      routes: [
        {
          path: '/test',
          handler(req, res) {
            return {
              ahihi: true
            }
          },
          children: [
            {
              path: '/test1',
              method: 'POST',
              handler() {
                return 'xin chao'
              }
            }
          ]
        }
      ],
      created(port) {
        got
          .post('http://0.0.0.0:' + port, {
            path: '/test/test1'
          })
          .then(res => {
            assert.equal(res.body, 'xin chao')
            return got('http://0.0.0.0:' + port, {
              path: '/test',
              json: true
            }).then(res => {
              assert.equal(res.body.ahihi, true)
              done()
            })
          })
          .catch(done)
      }
    })
  })
})
