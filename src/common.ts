//* common function

// Because you're using ES module, and __dirname isn't a part of ESM. 
// this code will help

// path handler
export const filterEmpty = (arr: any[]): any[] => arr.filter(element => (element != null && element != ''));
export const extension = (file: string) => file.split('.').pop();// get file extension
export const fileName = (file: string) => filterEmpty(file.split('.')).shift().split(/[\\/]/g).pop(); //get file name only
export const __dirname = process.cwd();

// json
export const { stringify, parse: jsonify } = JSON;
export const objify = (str: string): any | Error => { try { return jsonify(str); } catch (e) { return e; } }// turn string into json SAFELY 
export const isType = <T extends object>(obj: any, type: T): obj is T => (typeof obj === 'object' && (Object.keys(type) as (keyof T)[]).every(key => key in obj && typeof obj[key] === typeof type[key]));

// make id
export function getUniqueID(): string {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

