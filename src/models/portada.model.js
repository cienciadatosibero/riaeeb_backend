import pool from '../config/db.js';

const CAMPOS=[
  'hero_eyebrow','hero_titulo','hero_palabras','hero_descripcion','hero_boton_principal','hero_boton_secundario',
  'valor1_titulo','valor1_texto','valor2_titulo','valor2_texto','valor3_titulo','valor3_texto',
  'cta_eyebrow','cta_titulo','cta_descripcion','cta_boton',
  'contacto_correo','contacto_telefono','contacto_ubicacion',
  'footer_descripcion','footer_boletin_texto','twitter_url','linkedin_url','github_url',
  'cifra1_valor','cifra1_label','cifra2_valor','cifra2_label','cifra3_valor','cifra3_label','cifra4_valor','cifra4_label'
];

const DEFAULTS={
  hero_eyebrow:'Red de investigación abierta',
  hero_titulo:'Tecnología que impulsa',
  hero_palabras:'la equidad\nel bienestar\nla salud\nla robótica\nlos datos\nla sociedad\nel futuro',
  hero_descripcion:'Investigamos y difundimos el avance tecnológico en múltiples campos, con datos abiertos y métodos reproducibles, para que beneficie a todas las personas.',
  hero_boton_principal:'Explora nuestras investigaciones',
  hero_boton_secundario:'Súmate a la Red',
  valor1_titulo:'Equidad',valor1_texto:'Tecnología auditada y sin sesgos.',
  valor2_titulo:'Bienestar',valor2_texto:'Innovación centrada en las personas.',
  valor3_titulo:'Avance abierto',valor3_texto:'Datos y código para la comunidad.',
  cta_eyebrow:'Colabora con la Red',
  cta_titulo:'¿Quieres impulsar tecnología con impacto social? Hablemos.',
  cta_descripcion:'Propón un proyecto, súmate como investigador o solicita acceso a nuestros datos, publicaciones y recursos.',
  cta_boton:'Contáctanos',
  contacto_correo:'contacto@riaaeb.org',contacto_telefono:'+52 747 000 0000',contacto_ubicacion:'Chilpancingo, Guerrero, México',
  footer_descripcion:'Red de Inteligencia Artificial Aplicada para la Equidad y el Bienestar. Avance tecnológico con impacto social, datos abiertos y métodos reproducibles.',
  footer_boletin_texto:'Recibe nuestras publicaciones más recientes.',
  twitter_url:'',linkedin_url:'',github_url:'',
  cifra1_valor:'30+',cifra1_label:'Investigaciones',cifra2_valor:'15',cifra2_label:'Investigadores',cifra3_valor:'12',cifra3_label:'Alianzas',cifra4_valor:'8',cifra4_label:'Datos abiertos'
};

let listo=false;
async function ensure(){
  if(listo)return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contenido_portada (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hero_eyebrow VARCHAR(180) NULL,
      hero_titulo VARCHAR(220) NULL,
      hero_palabras TEXT NULL,
      hero_descripcion TEXT NULL,
      hero_boton_principal VARCHAR(120) NULL,
      hero_boton_secundario VARCHAR(120) NULL,
      valor1_titulo VARCHAR(120) NULL,
      valor1_texto VARCHAR(300) NULL,
      valor2_titulo VARCHAR(120) NULL,
      valor2_texto VARCHAR(300) NULL,
      valor3_titulo VARCHAR(120) NULL,
      valor3_texto VARCHAR(300) NULL,
      cta_eyebrow VARCHAR(160) NULL,
      cta_titulo VARCHAR(300) NULL,
      cta_descripcion TEXT NULL,
      cta_boton VARCHAR(120) NULL,
      contacto_correo VARCHAR(180) NULL,
      contacto_telefono VARCHAR(80) NULL,
      contacto_ubicacion VARCHAR(220) NULL,
      footer_descripcion TEXT NULL,
      footer_boletin_texto VARCHAR(300) NULL,
      twitter_url VARCHAR(500) NULL,
      linkedin_url VARCHAR(500) NULL,
      github_url VARCHAR(500) NULL,
      cifra1_valor VARCHAR(40) NULL,
      cifra1_label VARCHAR(120) NULL,
      cifra2_valor VARCHAR(40) NULL,
      cifra2_label VARCHAR(120) NULL,
      cifra3_valor VARCHAR(40) NULL,
      cifra3_label VARCHAR(120) NULL,
      cifra4_valor VARCHAR(40) NULL,
      cifra4_label VARCHAR(120) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  const [[r]]=await pool.query(`SELECT id FROM contenido_portada ORDER BY id LIMIT 1`);
  if(!r){
    const cols=CAMPOS.join(',');
    const qs=CAMPOS.map(()=>'?').join(',');
    await pool.query(`INSERT INTO contenido_portada (${cols}) VALUES (${qs})`,CAMPOS.map((k)=>DEFAULTS[k]));
  }
  listo=true;
}

export async function get(){
  await ensure();
  const [[r]]=await pool.query(`SELECT * FROM contenido_portada ORDER BY id LIMIT 1`);
  return r?{...DEFAULTS,...r}:DEFAULTS;
}

export async function save(d){
  await ensure();
  const actual=await get();
  const data={...DEFAULTS,...actual,...d};
  await pool.query(
    `UPDATE contenido_portada SET ${CAMPOS.map((k)=>`${k}=?`).join(',')} WHERE id=?`,
    [...CAMPOS.map((k)=>data[k]??null),actual.id]
  );
  return get();
}
