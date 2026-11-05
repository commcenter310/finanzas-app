// "1 gasto hormiga" / "3 gastos hormiga". `varios` por defecto agrega una "s".
export const plural = (n, uno, varios = `${uno}s`) => `${n} ${Number(n) === 1 ? uno : varios}`
