declare module "@litellm/lens-ui" {
  import type { ReactNode } from "react";

  export interface LensHost {
    surface: string;
    analysis: string;
    spendLogs: {
      lookup: (options: never) => Promise<unknown>;
      Drawer: (props: never) => ReactNode;
    };
  }

  export function configureLensHttp(http: object): void;

  export function LensHostProvider(props: { host: LensHost; children?: ReactNode }): ReactNode;

  export function LensWorkspace(props: object): ReactNode;
}
