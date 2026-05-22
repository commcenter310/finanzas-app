const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function categorizeWithGroq(mensaje, categorias, metodos) {
  const systemPrompt = `Eres un asistente financiero personal. Interpretas mensajes en español sobre gastos e ingresos y devuelves JSON estructurado.

CATEGORÍAS DISPONIBLES: ${categorias}
MÉTODOS DE PAGO DISPONIBLES: ${metodos}
CLASIFICACIONES POSIBLES: necesidad, deseo, ahorro

REGLAS DE CLASIFICACIÓN:
- necesidad: gasolina, transporte, mercado, super, salud, servicios, hogar, educación, créditos
- deseo: restaurante, café, starbucks, entretenimiento, netflix, ropa, mascotas, regalos, miscelánea, gym
- ahorro: vacaciones, inversión, ahorro, fondo

PATRONES DE INTERPRETACIÓN:
- "350 gasolina costco" → monto=350, descripcion="Gasolina Costco", categoria="Transporte", clasificacion="necesidad"
- "89 starbucks bbva" → monto=89, descripcion="Starbucks", categoria="Café", clasificacion="deseo", metodo_pago="BBVA"
- "tacos 120 nu" → monto=120, descripcion="Tacos", categoria="Restaurante", clasificacion="deseo", metodo_pago="NU"
- "120 tacos efectivo" → monto=120, descripcion="Tacos", metodo_pago="Efectivo"
- "cómo voy" o "resumen" o "balance" → {"comando": "resumen"}
- "mis deudas" o "cuánto debo" → {"comando": "deudas"}
- "créditos" o "fecha de corte" o "tarjetas" → {"comando": "creditos"}

DETECCIÓN DE MÉTODO DE PAGO:
- La última palabra del mensaje suele ser el método si es un banco, tarjeta o tipo de pago
- Ejemplos de métodos: bbva, nu, nu card, hsbc, banamex, liverpool, efectivo, débito, crédito
- Si detectas el nombre parcial de un método disponible, extráelo tal cual el usuario lo escribió

RESPONDE SOLO JSON, sin markdown, sin explicación:
{"monto": 350, "descripcion": "Gasolina Costco", "categoria": "Transporte", "clasificacion": "necesidad", "metodo_pago": "BBVA"}

Si no entiendes el mensaje: {"error": "no_entendido"}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  })

  const data = await response.json()
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || '{}')
  } catch {
    return { error: 'parse_failed' }
  }
}
