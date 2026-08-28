/** @type {{ path: string, type?: string }[]} */
export const revalidatePathCalls = [];
/** @type {{ tag: string, profile?: string }[]} */
export const revalidateTagCalls = [];

/** @param {string} path @param {string} [type] */
export function revalidatePath(path, type) {
  revalidatePathCalls.push({ path, type });
}

/** @param {string} tag @param {string} [profile] */
export function revalidateTag(tag, profile) {
  revalidateTagCalls.push({ tag, profile });
}

export function resetRevalidateCalls() {
  revalidatePathCalls.length = 0;
  revalidateTagCalls.length = 0;
}
