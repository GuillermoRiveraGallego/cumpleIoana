import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  type Blending,
  type Texture,
} from 'three'

const VERTICES = /* glsl */ `
attribute vec3 centro;
attribute vec2 tam;
attribute float giro;
attribute vec3 tinte;
attribute float alfa;
varying vec2 vUv;
varying vec3 vTinte;
varying float vAlfa;
void main() {
  vUv = uv;
  vTinte = tinte;
  vAlfa = alfa;
  // Billboard: el cuadrado se despliega en el espacio de la cámara, así que siempre la mira.
  vec4 mv = modelViewMatrix * vec4(centro, 1.0);
  float c = cos(giro);
  float s = sin(giro);
  vec2 p = position.xy * tam;
  mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENTOS = /* glsl */ `
uniform sampler2D mapa;
varying vec2 vUv;
varying vec3 vTinte;
varying float vAlfa;
void main() {
  vec4 t = texture2D(mapa, vUv);
  gl_FragColor = vec4(vTinte * t.rgb, t.a * vAlfa);
  #include <colorspace_fragment>
}
`

/**
 * Muchos sprites (cuadrados que siempre miran a la cámara) en UNA llamada de dibujo, cada uno con su
 * posición, tamaño, giro, color y opacidad. Se rellenan los arrays y se llama a `actualizar(n)`.
 * Las posiciones son locales al grupo donde se añada `malla`.
 */
export class Sprites {
  readonly malla: Mesh<InstancedBufferGeometry, ShaderMaterial>
  readonly centro: Float32Array
  readonly tam: Float32Array
  readonly giro: Float32Array
  readonly tinte: Float32Array
  readonly alfa: Float32Array
  private readonly atributos: InstancedBufferAttribute[]

  constructor(capacidad: number, mapa: Texture, blending: Blending) {
    const base = new PlaneGeometry(1, 1)
    const geo = new InstancedBufferGeometry()
    geo.setIndex(base.getIndex())
    geo.setAttribute('position', base.getAttribute('position'))
    geo.setAttribute('uv', base.getAttribute('uv'))
    this.centro = new Float32Array(capacidad * 3)
    this.tam = new Float32Array(capacidad * 2)
    this.giro = new Float32Array(capacidad)
    this.tinte = new Float32Array(capacidad * 3)
    this.alfa = new Float32Array(capacidad)
    const atributo = (nombre: string, datos: Float32Array, n: number) => {
      const a = new InstancedBufferAttribute(datos, n)
      a.setUsage(DynamicDrawUsage)
      geo.setAttribute(nombre, a)
      return a
    }
    this.atributos = [
      atributo('centro', this.centro, 3),
      atributo('tam', this.tam, 2),
      atributo('giro', this.giro, 1),
      atributo('tinte', this.tinte, 3),
      atributo('alfa', this.alfa, 1),
    ]
    geo.instanceCount = 0

    const material = new ShaderMaterial({
      uniforms: { mapa: { value: mapa } },
      vertexShader: VERTICES,
      fragmentShader: FRAGMENTOS,
      transparent: true,
      depthWrite: false,
      blending,
    })
    this.malla = new Mesh(geo, material)
    // Los sprites se mueven por todas partes: el volumen de la geometría base no sirve para descartarlos.
    this.malla.frustumCulled = false
    this.malla.renderOrder = 2
  }

  /** Escribe el sprite `i`. `color` en espacio lineal (p. ej. de `new Color('#hex')`). */
  poner(i: number, x: number, y: number, z: number, ancho: number, alto: number, giro: number, color: { r: number; g: number; b: number }, alfa: number) {
    this.centro[i * 3] = x
    this.centro[i * 3 + 1] = y
    this.centro[i * 3 + 2] = z
    this.tam[i * 2] = ancho
    this.tam[i * 2 + 1] = alto
    this.giro[i] = giro
    this.tinte[i * 3] = color.r
    this.tinte[i * 3 + 1] = color.g
    this.tinte[i * 3 + 2] = color.b
    this.alfa[i] = alfa
  }

  /** Dibuja los `n` primeros sprites. */
  actualizar(n: number) {
    this.malla.geometry.instanceCount = n
    for (const a of this.atributos) a.needsUpdate = true
  }

  dispose() {
    this.malla.geometry.dispose()
    this.malla.material.dispose()
  }
}
