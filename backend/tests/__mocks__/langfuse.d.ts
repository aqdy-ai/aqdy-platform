/**
 * Jest manual mock for the `langfuse` package.
 *
 * The real Langfuse client is already skipped in test environments via the
 * `NODE_ENV === "test"` guard in langfuse.config.ts. This stub exists purely
 * to satisfy Jest module resolution so tests don't fail with
 * "Cannot find module 'langfuse'".
 */
export declare const Langfuse: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
declare const _default: {
    Langfuse: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
};
export default _default;
//# sourceMappingURL=langfuse.d.ts.map