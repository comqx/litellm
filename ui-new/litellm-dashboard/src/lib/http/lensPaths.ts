import type {
  BuildRequest,
  BuildResult,
  Dataset,
  DatasetCreate,
  DatasetSummary,
  EvalCases,
  RevisionSave,
} from "@/components/lens/datasets/types";

interface JsonResponse<Body> {
  headers: { [name: string]: unknown };
  content: { "application/json": Body };
}

interface Query {
  query?: never;
  header?: never;
  path?: never;
  cookie?: never;
}

declare module "@/lib/http/schema" {
  interface paths {
    "/lens/datasets": {
      parameters: Query;
      get: {
        parameters: Query;
        responses: { 200: JsonResponse<DatasetSummary[]> };
      };
      put?: never;
      post: {
        parameters: Query;
        requestBody: { content: { "application/json": DatasetCreate } };
        responses: { 200: JsonResponse<Dataset> };
      };
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
    "/lens/datasets/{dataset_id}": {
      parameters: Query;
      get: {
        parameters: {
          query?: { revision?: number };
          header?: never;
          path: { dataset_id: string };
          cookie?: never;
        };
        responses: { 200: JsonResponse<Dataset> };
      };
      put?: never;
      post?: never;
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
    "/lens/datasets/build": {
      parameters: Query;
      get?: never;
      put?: never;
      post: {
        parameters: Query;
        requestBody: { content: { "application/json": BuildRequest } };
        responses: { 200: JsonResponse<BuildResult> };
      };
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
    "/lens/datasets/{dataset_id}/revisions": {
      parameters: Query;
      get?: never;
      put?: never;
      post: {
        parameters: {
          query?: never;
          header?: never;
          path: { dataset_id: string };
          cookie?: never;
        };
        requestBody: { content: { "application/json": RevisionSave } };
        responses: { 200: JsonResponse<Dataset> };
      };
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
    "/lens/datasets/{dataset_id}/revisions/{revision}/cases": {
      parameters: Query;
      get: {
        parameters: {
          query?: never;
          header?: never;
          path: { dataset_id: string; revision: number };
          cookie?: never;
        };
        responses: { 200: JsonResponse<EvalCases> };
      };
      put?: never;
      post?: never;
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
    "/lens/feedback": {
      parameters: Query;
      get: {
        parameters: {
          query?: { trace_id?: string; trace_ref?: string };
          header?: never;
          path?: never;
          cookie?: never;
        };
        responses: { 200: JsonResponse<Record<string, unknown>> };
      };
      put?: never;
      post?: never;
      delete?: never;
      options?: never;
      head?: never;
      patch?: never;
      trace?: never;
    };
  }
}

export {};
