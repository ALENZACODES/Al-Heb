/** Tiny English pluralisation helper: plural(1, 'review') -> 'review', plural(2, 'review') -> 'reviews'. */
export function plural(n, one, many = one + 's') { return Number(n) === 1 ? one : many; }
/** '1 review', '2 reviews'. */
export function count(n, one, many) { return `${n} ${plural(n, one, many)}`; }
