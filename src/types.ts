/**
 * Interface representing information about an R package
 */
export interface RPackageInfo {
    name: string;
    version: string;
    libpath: string;
    locationtype: string;
    title: string;
    loaded: boolean;
}

/**
 * Interface representing information about a Python package
 */
export interface PythonPackageInfo {
    name: string;
    version: string;
    location: string;
    summary: string;
    installed: boolean;
}

/**
 * Enum for supported languages
 */
export enum SupportedLanguage {
    R = 'r',
    Python = 'python'
}
