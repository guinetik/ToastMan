/**
 * Lightweight Chai-like Assertion Library
 *
 * Provides a fluent API for making assertions in Postman-style scripts.
 * Supports the most common assertions used in API testing.
 *
 * Usage:
 *   const expect = createExpect()
 *   expect(value).to.equal(expected)
 *   expect(value).to.be.a('string')
 *   expect(obj).to.have.property('key')
 */

/**
 * AssertionError - thrown when an assertion fails
 */
export class AssertionError extends Error {
  constructor(message, expected, actual) {
    super(message)
    this.name = 'AssertionError'
    this.expected = expected
    this.actual = actual
  }
}

/**
 * Assertion class - provides the fluent API
 */
class Assertion {
  constructor(value, negate = false) {
    this._value = value
    this._negate = negate
    this._deep = false
  }

  /**
   * Assert helper - handles negation
   */
  _assert(condition, message, expected, actual) {
    const pass = this._negate ? !condition : condition
    if (!pass) {
      const negatePrefix = this._negate ? 'not ' : ''
      throw new AssertionError(
        message.replace('{not}', negatePrefix),
        expected,
        actual
      )
    }
    return this
  }

  // Chainable language getters (return this for fluent API)
  get to() { return this }
  get be() { return this }
  get been() { return this }
  get is() { return this }
  get that() { return this }
  get which() { return this }
  get and() { return this }
  get has() { return this }
  get have() { return this }
  get with() { return this }
  get at() { return this }
  get of() { return this }
  get same() { return this }
  get but() { return this }
  get does() { return this }
  get still() { return this }

  /**
   * Negate the assertion
   */
  get not() {
    return new Assertion(this._value, !this._negate)
  }

  /**
   * Enable deep equality comparison
   */
  get deep() {
    this._deep = true
    return this
  }

  // ============================================
  // Value type assertions
  // ============================================

  /**
   * Assert value equals expected
   */
  equal(expected) {
    const isEqual = this._deep
      ? this._deepEqual(this._value, expected)
      : this._value === expected
    return this._assert(
      isEqual,
      `Expected ${this._format(this._value)} to {not}equal ${this._format(expected)}`,
      expected,
      this._value
    )
  }

  /**
   * Alias for equal
   */
  equals(expected) {
    return this.equal(expected)
  }

  /**
   * Alias for deep.equal
   */
  eql(expected) {
    return this.deep.equal(expected)
  }

  /**
   * Assert value is strictly equal (same reference)
   */
  eq(expected) {
    return this._assert(
      this._value === expected,
      `Expected ${this._format(this._value)} to {not}strictly equal ${this._format(expected)}`,
      expected,
      this._value
    )
  }

  /**
   * Assert value is of a certain type
   */
  a(type) {
    const actualType = this._getType(this._value)
    return this._assert(
      actualType === type.toLowerCase(),
      `Expected ${this._format(this._value)} to {not}be a ${type} (got ${actualType})`,
      type,
      actualType
    )
  }

  /**
   * Alias for a()
   */
  an(type) {
    return this.a(type)
  }

  // ============================================
  // Boolean assertions
  // ============================================

  /**
   * Assert value is true
   */
  get true() {
    return this._assert(
      this._value === true,
      `Expected ${this._format(this._value)} to {not}be true`,
      true,
      this._value
    )
  }

  /**
   * Assert value is false
   */
  get false() {
    return this._assert(
      this._value === false,
      `Expected ${this._format(this._value)} to {not}be false`,
      false,
      this._value
    )
  }

  /**
   * Assert value is null
   */
  get null() {
    return this._assert(
      this._value === null,
      `Expected ${this._format(this._value)} to {not}be null`,
      null,
      this._value
    )
  }

  /**
   * Assert value is undefined
   */
  get undefined() {
    return this._assert(
      this._value === undefined,
      `Expected ${this._format(this._value)} to {not}be undefined`,
      undefined,
      this._value
    )
  }

  /**
   * Assert value is NaN
   */
  get NaN() {
    return this._assert(
      Number.isNaN(this._value),
      `Expected ${this._format(this._value)} to {not}be NaN`,
      NaN,
      this._value
    )
  }

  /**
   * Assert value exists (not null or undefined)
   */
  get exist() {
    return this._assert(
      this._value !== null && this._value !== undefined,
      `Expected value to {not}exist`,
      'value',
      this._value
    )
  }

  /**
   * Assert value is truthy
   */
  get ok() {
    return this._assert(
      !!this._value,
      `Expected ${this._format(this._value)} to {not}be truthy`,
      'truthy',
      this._value
    )
  }

  /**
   * Assert value is empty (string, array, or object with no keys)
   */
  get empty() {
    let isEmpty = false
    if (typeof this._value === 'string' || Array.isArray(this._value)) {
      isEmpty = this._value.length === 0
    } else if (typeof this._value === 'object' && this._value !== null) {
      isEmpty = Object.keys(this._value).length === 0
    }
    return this._assert(
      isEmpty,
      `Expected ${this._format(this._value)} to {not}be empty`,
      'empty',
      this._value
    )
  }

  // ============================================
  // Numeric assertions
  // ============================================

  /**
   * Assert value is above n
   */
  above(n) {
    return this._assert(
      this._value > n,
      `Expected ${this._value} to {not}be above ${n}`,
      `> ${n}`,
      this._value
    )
  }

  /**
   * Alias for above
   */
  gt(n) {
    return this.above(n)
  }

  /**
   * Alias for above
   */
  greaterThan(n) {
    return this.above(n)
  }

  /**
   * Assert value is at least n
   */
  least(n) {
    return this._assert(
      this._value >= n,
      `Expected ${this._value} to {not}be at least ${n}`,
      `>= ${n}`,
      this._value
    )
  }

  /**
   * Alias for least
   */
  gte(n) {
    return this.least(n)
  }

  /**
   * Assert value is below n
   */
  below(n) {
    return this._assert(
      this._value < n,
      `Expected ${this._value} to {not}be below ${n}`,
      `< ${n}`,
      this._value
    )
  }

  /**
   * Alias for below
   */
  lt(n) {
    return this.below(n)
  }

  /**
   * Alias for below
   */
  lessThan(n) {
    return this.below(n)
  }

  /**
   * Assert value is at most n
   */
  most(n) {
    return this._assert(
      this._value <= n,
      `Expected ${this._value} to {not}be at most ${n}`,
      `<= ${n}`,
      this._value
    )
  }

  /**
   * Alias for most
   */
  lte(n) {
    return this.most(n)
  }

  /**
   * Assert value is within range
   */
  within(min, max) {
    return this._assert(
      this._value >= min && this._value <= max,
      `Expected ${this._value} to {not}be within ${min}..${max}`,
      `${min}-${max}`,
      this._value
    )
  }

  /**
   * Assert value is close to expected within delta
   */
  closeTo(expected, delta) {
    return this._assert(
      Math.abs(this._value - expected) <= delta,
      `Expected ${this._value} to {not}be close to ${expected} (delta: ${delta})`,
      expected,
      this._value
    )
  }

  // ============================================
  // String/Array assertions
  // ============================================

  /**
   * Assert value includes substring or element
   */
  include(val) {
    let includes = false
    if (typeof this._value === 'string') {
      includes = this._value.includes(val)
    } else if (Array.isArray(this._value)) {
      includes = this._value.includes(val)
    } else if (typeof this._value === 'object' && this._value !== null) {
      // For objects, check if all properties of val exist with same values
      includes = Object.keys(val).every(key =>
        this._deep
          ? this._deepEqual(this._value[key], val[key])
          : this._value[key] === val[key]
      )
    }
    return this._assert(
      includes,
      `Expected ${this._format(this._value)} to {not}include ${this._format(val)}`,
      val,
      this._value
    )
  }

  /**
   * Alias for include
   */
  contain(val) {
    return this.include(val)
  }

  /**
   * Alias for include
   */
  contains(val) {
    return this.include(val)
  }

  /**
   * Alias for include
   */
  includes(val) {
    return this.include(val)
  }

  /**
   * Assert string matches regex
   */
  match(regex) {
    return this._assert(
      regex.test(this._value),
      `Expected ${this._format(this._value)} to {not}match ${regex}`,
      regex.toString(),
      this._value
    )
  }

  /**
   * Assert string starts with prefix
   */
  startWith(prefix) {
    return this._assert(
      typeof this._value === 'string' && this._value.startsWith(prefix),
      `Expected ${this._format(this._value)} to {not}start with ${this._format(prefix)}`,
      prefix,
      this._value
    )
  }

  /**
   * Alias for startWith
   */
  startsWith(prefix) {
    return this.startWith(prefix)
  }

  /**
   * Assert string ends with suffix
   */
  endWith(suffix) {
    return this._assert(
      typeof this._value === 'string' && this._value.endsWith(suffix),
      `Expected ${this._format(this._value)} to {not}end with ${this._format(suffix)}`,
      suffix,
      this._value
    )
  }

  /**
   * Alias for endWith
   */
  endsWith(suffix) {
    return this.endWith(suffix)
  }

  // ============================================
  // Length assertions
  // ============================================

  /**
   * Assert value has specific length
   */
  lengthOf(n) {
    const len = this._value?.length
    return this._assert(
      len === n,
      `Expected ${this._format(this._value)} to {not}have length ${n} (got ${len})`,
      n,
      len
    )
  }

  /**
   * Access length property for chaining
   */
  get length() {
    return new Assertion(this._value?.length, this._negate)
  }

  // ============================================
  // Object assertions
  // ============================================

  /**
   * Assert object has property (optionally with value)
   */
  property(name, value) {
    const hasProperty = Object.prototype.hasOwnProperty.call(this._value || {}, name)

    if (arguments.length === 1) {
      return this._assert(
        hasProperty,
        `Expected object to {not}have property '${name}'`,
        name,
        Object.keys(this._value || {})
      )
    }

    const propValue = this._value?.[name]
    const valueMatches = this._deep
      ? this._deepEqual(propValue, value)
      : propValue === value

    return this._assert(
      hasProperty && valueMatches,
      `Expected property '${name}' to {not}equal ${this._format(value)} (got ${this._format(propValue)})`,
      value,
      propValue
    )
  }

  /**
   * Assert object has all keys
   */
  keys(...keys) {
    const actualKeys = Object.keys(this._value || {})
    const flatKeys = keys.flat()
    const hasAllKeys = flatKeys.every(key => actualKeys.includes(key))
    return this._assert(
      hasAllKeys,
      `Expected object to {not}have keys [${flatKeys.join(', ')}]`,
      flatKeys,
      actualKeys
    )
  }

  /**
   * Alias for keys
   */
  key(...keys) {
    return this.keys(...keys)
  }

  /**
   * Assert object is instance of constructor
   */
  instanceof(constructor) {
    return this._assert(
      this._value instanceof constructor,
      `Expected value to {not}be instance of ${constructor.name}`,
      constructor.name,
      this._getType(this._value)
    )
  }

  /**
   * Alias for instanceof
   */
  instanceOf(constructor) {
    return this.instanceof(constructor)
  }

  // ============================================
  // Array-specific assertions
  // ============================================

  /**
   * Assert value is one of the given values
   */
  oneOf(list) {
    const isIncluded = list.includes(this._value)
    return this._assert(
      isIncluded,
      `Expected ${this._format(this._value)} to {not}be one of [${list.map(v => this._format(v)).join(', ')}]`,
      list,
      this._value
    )
  }

  /**
   * Assert array has members
   */
  members(subset) {
    const hasAllMembers = subset.every(item =>
      this._deep
        ? this._value.some(v => this._deepEqual(v, item))
        : this._value.includes(item)
    )
    return this._assert(
      hasAllMembers,
      `Expected array to {not}include members [${subset.map(v => this._format(v)).join(', ')}]`,
      subset,
      this._value
    )
  }

  // ============================================
  // Function assertions
  // ============================================

  /**
   * Assert function throws an error
   */
  throw(errorType) {
    let threw = false
    let thrownError = null

    try {
      this._value()
    } catch (e) {
      threw = true
      thrownError = e
    }

    if (errorType) {
      const matchesType = thrownError instanceof errorType
      return this._assert(
        threw && matchesType,
        `Expected function to {not}throw ${errorType.name}`,
        errorType.name,
        thrownError?.constructor?.name
      )
    }

    return this._assert(
      threw,
      `Expected function to {not}throw`,
      'error',
      thrownError
    )
  }

  /**
   * Alias for throw
   */
  throws(errorType) {
    return this.throw(errorType)
  }

  // ============================================
  // Helper methods
  // ============================================

  /**
   * Deep equality comparison
   */
  _deepEqual(a, b) {
    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false

      const keysA = Object.keys(a)
      const keysB = Object.keys(b)

      if (keysA.length !== keysB.length) return false

      return keysA.every(key => this._deepEqual(a[key], b[key]))
    }

    return false
  }

  /**
   * Get type name of value
   */
  _getType(value) {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
  }

  /**
   * Format value for error messages
   */
  _format(value) {
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }
}

/**
 * Create the expect function
 */
export function createExpect() {
  return function expect(value) {
    return new Assertion(value)
  }
}

export default { createExpect, AssertionError }
