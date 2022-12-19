export declare const filterEmpty: (arr: any[]) => any[];
export declare const extension: (file: string) => string | undefined;
export declare const fileName: (file: string) => any;
export declare const __dirname: string;
export declare const stringify: {
    (value: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): string;
    (value: any, replacer?: (string | number)[] | null | undefined, space?: string | number | undefined): string;
}, jsonify: (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) => any;
export declare const objify: (str: string) => any | Error;
export declare const isType: <T extends object>(obj: any, type: T) => obj is T;
export declare function getUniqueID(): string;
