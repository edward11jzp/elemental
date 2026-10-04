-- ============================================================================
-- Catálogo de Elemental Factory (sistema anterior), tomado de su exportación
-- de inventario del 4/10/2026.
--
-- Productos agrupados por talla, con sus colores y su precio al detal.
-- Entran como SOLO FACTURACIÓN (web = false): se usan en el mostrador y en
-- Inventario, y no aparecen en la tienda en línea. Sin fotos y con
-- existencias en cero.
--
-- Repetir la ejecución actualiza tallas, colores y precios en vez de duplicar.
-- ============================================================================

begin;

create temporary table _import (
  name text, category text, subcategory text, sizes jsonb, colors jsonb,
  retail numeric(10,2), wholesale numeric(10,2)
) on commit drop;

insert into _import (name, category, subcategory, sizes, colors, retail, wholesale) values
  ('BERMUDAS', 'men', 'bermudas', '["32", "36", "38"]'::jsonb, '[]'::jsonb, 15.5, 12.4),
  ('BODY NIÑO', 'kids', 'bodies', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AMARILLO CLARO", "AZUL OSCURO", "AZUL REY", "BLANCO", "CELESTE", "GRIS CLARO", "LILA", "NEGRO", "ROJO", "ROSADO", "VERDE NAVIDAD", "VINOTINTO"]'::jsonb, 10.0, 8.0),
  ('CHAQUETA', 'men', 'chaquetas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL OSCURO", "GRIS CLARO", "GRIS OSCURO", "NEGRO", "ROJO"]'::jsonb, 26.0, 20.8),
  ('CHAQUETA NIÑO', 'kids', 'chaquetas', '["6-8", "10-12", "14-16", "2-6"]'::jsonb, '["AZUL OSCURO", "GRIS CLARO", "GRIS OSCURO", "NEGRO"]'::jsonb, 26.0, 20.8),
  ('CHEMISE', 'men', 'chemises', '["S", "M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "GRIS JASPE CLARO", "GRIS JASPE OSCURO", "LADRILLO", "MOSTAZA", "NARANJA", "NEGRO", "PLOMO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 13.0, 10.4),
  ('CHEMISE DAMA', 'women', 'chemises', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "GRIS CLARO", "GRIS OSCURO", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD"]'::jsonb, 13.0, 10.4),
  ('CHEMISE MANGA LRG', 'men', 'chemises', '["S", "M", "L", "XL"]'::jsonb, '["AZUL REY", "NEGRO", "ROJO", "VERDE NAVIDAD"]'::jsonb, 16.0, 12.8),
  ('CHEMISE NIÑO', 'kids', 'chemises', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["BLANCO", "NEGRO", "ROJO"]'::jsonb, 13.0, 10.4),
  ('CROP TOP', 'women', 'crop tops', '[]'::jsonb, '["ACANALADO", "HOLGADO"]'::jsonb, 9.0, 7.2),
  ('FRANELA CUELLO V', 'men', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BLANCO", "GRIS CLARO", "NEGRO", "ROJO", "VERDE MILITAR"]'::jsonb, 10.0, 8.0),
  ('FRANELA CUELLO V DAMA', 'women', 'franelas', '["S", "M", "L", "XL"]'::jsonb, '["AMARILLO CLARO", "AZUL REY", "BLANCO", "GRIS CLARO", "NEGRO", "ROJO", "ROSADO", "VERDE NAVIDAD"]'::jsonb, 10.0, 8.0),
  ('FRANELA DAMA', 'women', 'franelas', '["S", "M", "L", "XL", "2XL", "3XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AMARILLO NEON", "AZUL OSCURO", "AZUL PETROLEO", "AZUL REY", "BEIGE", "BLANCO", "CAMU GRIS CLARO", "CAMU GRIS OSCURO", "CAMU VERDE MILITAR", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NARANJA", "NARANJA NEON", "NEGRO", "ROJO", "ROSADO", "ROSADO BARBIE", "ROSADO NEON", "SALMON", "TERRACOTA", "TURQUESA", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE NEON", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 9.0, 7.2),
  ('FRANELA MANGA LRG', 'men', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL MARINO", "AZUL REY", "BLANCO", "GRIS CLARO", "GRIS OSCURO", "NEGRA", "ROJO", "VERDE MILITAR", "VINOTINTO"]'::jsonb, 13.0, 10.4),
  ('FRANELA MANGA LRG DAMA', 'women', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL MARINO", "AZUL REY", "BLANCO", "GRIS CLARO", "GRIS OSCURO", "NEGRA", "NEGRO", "ROJA", "ROJO", "ROSADO", "VINOTINTO"]'::jsonb, 13.0, 10.4),
  ('FRANELA NIÑO', 'kids', 'franelas', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AMARILLO NEON", "AZUL OSCURO", "AZUL PETROLEO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NARANJA", "NARANJA NEON", "NEGRO", "ROJO", "ROSADO", "ROSADO NEON", "TURQUESA", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE NEON", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 9.0, 7.2),
  ('FRANELA UNISEX', 'men', 'franelas', '["S", "M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AMARILLO NEON", "AZUL OSCURO", "AZUL PETROLEO", "AZUL REY", "BEIGE", "BLANCO", "BLANCO JASPE", "CAMU GRIS CLARO", "CAMU GRIS OSCURO", "CAMU VERDE MILITAR", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MARRON OSCURO", "MORADO", "MOSTAZA", "NARANJA", "NARANJA NEON", "NEGRO", "ROJO", "ROSADO", "ROSADO NEON", "SALMON", "TERRACOTA", "TURQUESA", "VERDE ESMERALDA", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE NEON", "VERDE OLIVA", "VERDE SECO", "VINOTINTO"]'::jsonb, 9.0, 7.2),
  ('FRANELILLA CABALLERO', 'men', 'franelillas', '["S", "M", "L", "XL"]'::jsonb, '["BLANCO", "GRIS CLARO", "NEGRO", "ROJO"]'::jsonb, 11.5, 9.2),
  ('FRANELILLA DAMA', 'women', 'franelillas', '["S", "M", "XL"]'::jsonb, '["BLANCO", "NEGRO", "ROJO"]'::jsonb, 9.0, 7.2),
  ('GORRAS', 'men', 'gorras', '[]'::jsonb, '["ACRILICA", "DRILL", "MALLA", "PLANA", "VISERA"]'::jsonb, 8.5, 6.8),
  ('HOODIE', 'men', 'hoodies', '["S", "M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["AMARILLO FUERTE", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "NEGRO", "ROJO", "ROSADO", "VERDE BOTELLA", "VERDE NAVIDAD", "VINOTINTO"]'::jsonb, 25.0, 20.0),
  ('HOODIE NIÑO', 'kids', 'hoodies', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "GRIS OSCURO", "GUAYABA", "LILA", "NEGRO", "ROJO", "ROSADO", "VINOTINTO"]'::jsonb, 25.0, 20.0),
  ('JOGGER CABALLERO', 'men', 'joggers', '["S", "M", "L", "XL"]'::jsonb, '["AZUL MARINO", "AZUL OSCURO", "AZUL REY", "BLANCO", "CAMU VERDE MILITAR", "GRIS CLARO", "GRIS OSCURO", "NEGRO", "ROJO", "VERDE MILITAR", "VINOTINTO"]'::jsonb, 15.0, 12.0),
  ('JOGGER DAMA', 'women', 'joggers', '["S", "M", "L", "XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CAMU VERDE MILITAR", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MORADO", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 15.0, 12.0),
  ('JOGGER NIÑO', 'kids', 'joggers', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "GRIS CLARO", "GRIS OSCURO", "LILA", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 15.0, 12.0),
  ('LEGGINS', 'women', 'leggins', '["S", "M", "L", "XL"]'::jsonb, '[]'::jsonb, 13.5, 10.8),
  ('MEDIAS', 'men', 'accesorios', '[]'::jsonb, '["MEDIAS"]'::jsonb, 6.0, 4.8),
  ('MICRODURAZNO', 'men', 'franelas', '["S", "L", "XL"]'::jsonb, '[]'::jsonb, 8.0, 6.4),
  ('OVERSIZE', 'men', 'oversize', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["ACANALADO", "ACID WASH", "AZUL REY", "BEIGE", "BLANCO", "CAMEL", "CREMA", "GRIS CLARO", "GUAYABA", "LILA", "MARRON", "NEGRO", "ROJO", "VERDE OLIVA"]'::jsonb, 14.5, 11.6),
  ('SHORT CABALLERO', 'men', 'shorts', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "BLANCO", "GRIS CLARO", "NEGRO", "ROJO"]'::jsonb, 13.0, 10.4),
  ('SHORT DAMA', 'women', 'shorts', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "BLANCO", "CELESTE", "CREMA", "GRIS CLARO", "GUAYABA", "LILA", "MARRON", "ROJO", "ROSADO", "VERDE MILITAR"]'::jsonb, 13.0, 10.4),
  ('SUETER', 'men', 'sueteres', '["S", "M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["AMARILLO", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "CREMA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NEGRO", "ROJO", "ROSADO", "VERDE BOTELLA", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 23.0, 18.4),
  ('SUETER NIÑO', 'kids', 'sueteres', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "FUCSIA", "GRIS CLARO", "GUAYABA", "LILA", "NEGRO", "ROJO", "ROSADO", "VERDE NAVIDAD"]'::jsonb, 23.0, 18.4),
  ('TULA', 'men', 'accesorios', '[]'::jsonb, '["TULA"]'::jsonb, 6.0, 4.8),
  ('VESTIDO', 'women', 'vestidos', '["S", "M", "L"]'::jsonb, '[]'::jsonb, 13.0, 10.4);

-- Los nombres que ya existen en la tienda en línea se distinguen, para que en
-- el punto de venta no se confundan con los suyos.
update _import i set name = i.name || ' (facturación)'
 where exists (select 1 from public.products p where upper(p.name) = upper(i.name) and p.web);

insert into public.products (name, category, subcategory, description, retail_price, wholesale_price,
                             image, images, sizes, colors, color_palette, stock, min_stock,
                             allow_custom, featured, trending, web)
select i.name, i.category, i.subcategory, '', i.retail, i.wholesale,
       '', '[]'::jsonb, i.sizes, i.colors, '[]'::jsonb, 0, 0,
       false, false, false, false
  from _import i
 where not exists (select 1 from public.products p where upper(p.name) = upper(i.name));

update public.products p
   set sizes = i.sizes, colors = i.colors, category = i.category, subcategory = i.subcategory,
       retail_price = i.retail, wholesale_price = i.wholesale, updated_at = now()
  from _import i
 where upper(p.name) = upper(i.name) and p.web = false;

commit;

select count(*) || ' productos de facturación en el catálogo' from public.products where web = false;
