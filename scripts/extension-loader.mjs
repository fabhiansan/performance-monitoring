const ALLOWED_PREFIXES = ['./', '../'];

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (!shouldAttempt(specifier)) {
      throw error;
    }

    // Try with explicit .js extension
    try {
      const withJs = appendJsExtension(specifier);
      return await defaultResolve(withJs, context, defaultResolve);
    } catch (innerError) {
      if (innerError.code !== 'ERR_MODULE_NOT_FOUND') {
        throw innerError;
      }

      const withIndex = appendIndex(specifier);
      return defaultResolve(withIndex, context, defaultResolve);
    }
  }
}

function shouldAttempt(specifier) {
  return ALLOWED_PREFIXES.some((prefix) => specifier.startsWith(prefix)) &&
    !specifier.endsWith('.js') &&
    !specifier.endsWith('.json') &&
    !specifier.endsWith('.node');
}

function appendJsExtension(specifier) {
  if (specifier.endsWith('/')) {
    return `${specifier}index.js`;
  }
  return `${specifier}.js`;
}

function appendIndex(specifier) {
  if (specifier.endsWith('/')) {
    return `${specifier}index.js`;
  }
  return `${specifier}/index.js`;
}
