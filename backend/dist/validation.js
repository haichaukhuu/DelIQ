export function stringQuery(request, name, options = {}) {
    const value = request.query[name];
    if (value === undefined) {
        if (options.required)
            throw new Error(`${name} is required`);
        return undefined;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${name} must be a non-empty string`);
    }
    const result = value.trim();
    if (options.maxLength && result.length > options.maxLength) {
        throw new Error(`${name} is too long`);
    }
    return result;
}
export function bodyString(body, name, options = {}) {
    if (!body || typeof body !== 'object')
        throw new Error('Request body must be an object');
    const value = body[name];
    if (value === undefined) {
        if (options.required)
            throw new Error(`${name} is required`);
        return undefined;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${name} must be a non-empty string`);
    }
    const result = value.trim();
    if (options.maxLength && result.length > options.maxLength) {
        throw new Error(`${name} is too long`);
    }
    return result;
}
export function bodyUuid(body, name) {
    const value = bodyString(body, name, { required: true });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error(`${name} must be a UUID`);
    }
    return value;
}
