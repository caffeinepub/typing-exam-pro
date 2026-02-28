import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Passage {
    id: string;
    title: string;
    content: string;
    timeMinutes: bigint;
}
export interface UserProfile {
    name: string;
    passwordHash: string;
    sessionId: string;
    mobile: string;
}
export interface TestResult {
    id: string;
    wpm: bigint;
    userName: string;
    passageTitle: string;
    mistakes: bigint;
    timestamp: Time;
    userMobile: string;
    accuracy: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAdmin(): Promise<void>;
    addPassage(title: string, content: string, timeMinutes: bigint): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkSessionValid(mobile: string, sessionId: string): Promise<boolean>;
    deletePassage(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPassages(): Promise<Array<Passage>>;
    getTestResults(): Promise<Array<TestResult>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    login(mobile: string, password: string): Promise<{
        __kind__: "ok";
        ok: {
            name: string;
            sessionId: string;
            mobile: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    logout(mobile: string): Promise<void>;
    registerUser(name: string, mobile: string, password: string): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedData(): Promise<void>;
    submitTestResult(userName: string, userMobile: string, passageTitle: string, wpm: bigint, accuracy: bigint, mistakes: bigint): Promise<void>;
    updatePassage(id: string, title: string, content: string, timeMinutes: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
