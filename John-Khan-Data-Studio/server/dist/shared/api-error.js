/** 业务异常：携带 HTTP 状态码与稳定的错误码，供前端区分处理。 */
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
    static badRequest(message, details) {
        return new ApiError(400, 'BAD_REQUEST', message, details);
    }
    static notFound(message = '请求的资源不存在') {
        return new ApiError(404, 'NOT_FOUND', message);
    }
}
//# sourceMappingURL=api-error.js.map