/** Lista de controles según el dispositivo. */
export function ListaControles({ tactil }: { tactil: boolean }) {
  const filas = tactil
    ? [
        ['Joystick', 'Pon el pulgar abajo a la izquierda para caminar'],
        ['Deslizar', 'Arrastra el dedo por la pantalla para mirar alrededor'],
        ['Cuadros', 'Acércate y pulsa «Ver recuerdo», o toca el cuadro'],
      ]
    : [
        ['WASD / flechas', 'Caminar (Shift para ir más rápido)'],
        ['Arrastrar ratón', 'Mirar alrededor · rueda para acercar'],
        ['E o clic', 'Ver el recuerdo que tienes delante'],
      ]
  return (
    <dl className="controles">
      {filas.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
