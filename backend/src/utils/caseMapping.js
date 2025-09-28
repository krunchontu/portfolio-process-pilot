// Case conversion utilities for consistent API <-> DB naming

// Convert snake_case to camelCase (preserves already-camel keys)
function toCamel(str) {
  if (typeof str !== 'string') return str
  if (!str.includes('_')) return str
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// Convert camelCase to snake_case (preserves already-snake keys)
function toSnake(str) {
  if (typeof str !== 'string') return str
  if (str.includes('_')) return str
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

// Recursively map object keys using a transform function.
// Options:
// - deep: recurse into nested objects/arrays (default: false)
// - exclude: array of property names to skip recursion under (e.g., ['payload'])
function mapKeys(obj, transform, { deep = false, exclude = [] } = {}) {
  if (Array.isArray(obj)) {
    return deep ? obj.map((v) => mapKeys(v, transform, { deep, exclude })) : obj.slice()
  }

  if (!isPlainObject(obj)) return obj

  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = transform(key)
    if (deep && isPlainObject(value) && !exclude.includes(newKey)) {
      out[newKey] = mapKeys(value, transform, { deep, exclude })
    } else if (deep && Array.isArray(value) && !exclude.includes(newKey)) {
      out[newKey] = value.map((v) => mapKeys(v, transform, { deep, exclude }))
    } else {
      out[newKey] = value
    }
  }
  return out
}

function keysToCamel(obj, options = {}) {
  return mapKeys(obj, toCamel, options)
}

function keysToSnake(obj, options = {}) {
  return mapKeys(obj, toSnake, options)
}

module.exports = {
  toCamel,
  toSnake,
  keysToCamel,
  keysToSnake
}
