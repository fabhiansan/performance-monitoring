/* eslint-disable */
import type {
  ApiErrorMetadata,
  ApiMetadata,
  ApiResponseBody
} from './responseFormatter';

declare module 'express-serve-static-core' {
  interface Response<
    ResBody = unknown,
    Locals extends Record<string, unknown> = Record<string, unknown>,
    StatusCode extends number = number
  > {
    apiSuccess: <
      TData = unknown,
      TMetadata extends Record<string, unknown> = Record<string, unknown>
    >(
      data: TData,
      message?: string | null,
      metadata?: TMetadata
    ) => Response<ApiResponseBody<TData, ApiMetadata<TMetadata>>, Locals, StatusCode>;

    apiError: <
      TMetadata extends Record<string, unknown> = Record<string, unknown>
    >(
      statusCode: number,
      message: string,
      code?: string,
      details?: unknown,
      metadata?: TMetadata
    ) => Response<ApiResponseBody<null, ApiErrorMetadata<TMetadata>>, Locals, StatusCode>;

    apiValidationError: <
      TMetadata extends Record<string, unknown> = Record<string, unknown>
    >(
      message: string,
      validationErrors?: unknown[],
      metadata?: TMetadata
    ) => Response<ApiResponseBody<null, ApiErrorMetadata<TMetadata>>, Locals, StatusCode>;

    apiNotFound: <
      TMetadata extends Record<string, unknown> = Record<string, unknown>
    >(
      resource?: string,
      metadata?: TMetadata
    ) => Response<ApiResponseBody<null, ApiErrorMetadata<TMetadata>>, Locals, StatusCode>;

    apiServerError: <
      TMetadata extends Record<string, unknown> = Record<string, unknown>
    >(
      message?: string,
      details?: unknown,
      metadata?: TMetadata
    ) => Response<ApiResponseBody<null, ApiErrorMetadata<TMetadata>>, Locals, StatusCode>;
  }
}
