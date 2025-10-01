
  'use strict'

  const Serializer = require('fast-json-stringify/lib/serializer')
  const serializerState = {"mode":"standalone"}
  const serializer = Serializer.restoreFromState(serializerState)

  const Validator = require('fast-json-stringify/lib/validator')
const validatorState = {"ajvOptions":{},"ajvSchemas":{"__fjs_root_1":{"type":"object","properties":{},"if":{"type":"object","properties":{"kind":{"type":"string","enum":["foobar"]}}},"then":{"type":"object","properties":{"kind":{"type":"string","enum":["foobar"]},"foo":{"type":"string"},"bar":{"type":"number"},"list":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"value":{"type":"string"}}}}}},"else":{"type":"object","properties":{"kind":{"type":"string","enum":["greeting"]},"hi":{"type":"string"},"hello":{"type":"number"},"list":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"value":{"type":"string"}}}}}}}}}
const validator = Validator.restoreFromState(validatorState)


  module.exports = function anonymous(validator,serializer
) {

    const JSON_STR_BEGIN_OBJECT = '{'
    const JSON_STR_END_OBJECT = '}'
    const JSON_STR_BEGIN_ARRAY = '['
    const JSON_STR_END_ARRAY = ']'
    const JSON_STR_COMMA = ','
    const JSON_STR_COLONS = ':'
    const JSON_STR_QUOTE = '"'
    const JSON_STR_EMPTY_OBJECT = JSON_STR_BEGIN_OBJECT + JSON_STR_END_OBJECT
    const JSON_STR_EMPTY_ARRAY = JSON_STR_BEGIN_ARRAY + JSON_STR_END_ARRAY
    const JSON_STR_EMPTY_STRING = JSON_STR_QUOTE + JSON_STR_QUOTE
    const JSON_STR_NULL = 'null'
  
    function main (input) {
      let json = ''
      
    if (validator.validate("__fjs_root_1#/if", input)) {
      json += anonymous0(input)
    } else {
      json += anonymous3(input)
    }
  
      return json
    }
    
  
    // __fjs_merged_2#/properties/list/items
    function anonymous2 (input) {
      const obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      if (obj === null) return JSON_STR_EMPTY_OBJECT

      let value
let json = JSON_STR_BEGIN_OBJECT
let addComma = false

      value = obj["name"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"name\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["value"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"value\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

    return json + JSON_STR_END_OBJECT
  
    }
  

    function anonymous1 (obj) {
      // __fjs_merged_2#/properties/list
  
    if (obj === null) return JSON_STR_EMPTY_ARRAY
    if (!Array.isArray(obj)) {
      throw new TypeError(`The value of '__fjs_merged_2#/properties/list' does not match schema definition.`)
    }
    const arrayLength = obj.length
  
    const arrayEnd = arrayLength - 1
    let value
    let json = ''
  
      for (let i = 0; i < arrayLength; i++) {
        json += anonymous2(obj[i])
        if (i < arrayEnd) {
          json += JSON_STR_COMMA
        }
      }
    return JSON_STR_BEGIN_ARRAY + json + JSON_STR_END_ARRAY
  }

  
    // __fjs_merged_2#
    function anonymous0 (input) {
      const obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      if (obj === null) return JSON_STR_EMPTY_OBJECT

      let value
let json = JSON_STR_BEGIN_OBJECT
let addComma = false

      value = obj["kind"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"kind\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["foo"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"foo\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["bar"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"bar\":"
        json += serializer.asNumber(value)
      }

      value = obj["list"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"list\":"
        json += anonymous1(value)
      }

    return json + JSON_STR_END_OBJECT
  
    }
  

  
    // __fjs_merged_3#/properties/list/items
    function anonymous5 (input) {
      const obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      if (obj === null) return JSON_STR_EMPTY_OBJECT

      let value
let json = JSON_STR_BEGIN_OBJECT
let addComma = false

      value = obj["name"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"name\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["value"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"value\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

    return json + JSON_STR_END_OBJECT
  
    }
  

    function anonymous4 (obj) {
      // __fjs_merged_3#/properties/list
  
    if (obj === null) return JSON_STR_EMPTY_ARRAY
    if (!Array.isArray(obj)) {
      throw new TypeError(`The value of '__fjs_merged_3#/properties/list' does not match schema definition.`)
    }
    const arrayLength = obj.length
  
    const arrayEnd = arrayLength - 1
    let value
    let json = ''
  
      for (let i = 0; i < arrayLength; i++) {
        json += anonymous5(obj[i])
        if (i < arrayEnd) {
          json += JSON_STR_COMMA
        }
      }
    return JSON_STR_BEGIN_ARRAY + json + JSON_STR_END_ARRAY
  }

  
    // __fjs_merged_3#
    function anonymous3 (input) {
      const obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      if (obj === null) return JSON_STR_EMPTY_OBJECT

      let value
let json = JSON_STR_BEGIN_OBJECT
let addComma = false

      value = obj["kind"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"kind\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["hi"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"hi\":"
        
        if (typeof value !== 'string') {
          if (value === null) {
            json += JSON_STR_EMPTY_STRING
          } else if (value instanceof Date) {
            json += JSON_STR_QUOTE + value.toISOString() + JSON_STR_QUOTE
          } else if (value instanceof RegExp) {
            json += serializer.asString(value.source)
          } else {
            json += serializer.asString(value.toString())
          }
        } else {
          json += serializer.asString(value)
        }
        
      }

      value = obj["hello"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"hello\":"
        json += serializer.asNumber(value)
      }

      value = obj["list"]
      if (value !== undefined) {
        !addComma && (addComma = true) || (json += JSON_STR_COMMA)
        json += "\"list\":"
        json += anonymous4(value)
      }

    return json + JSON_STR_END_OBJECT
  
    }
  
    return main
    
}(validator, serializer)