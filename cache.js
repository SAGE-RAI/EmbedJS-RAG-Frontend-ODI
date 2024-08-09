// cache.js
const cache = {};

function get(key) {
    return cache[key];
}

function set(key, value) {
    cache[key] = value;
}

function remove(key) {
    delete cache[key];
}

export { get, set, remove };