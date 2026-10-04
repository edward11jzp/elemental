-- ============================================================================
-- Importación del catálogo de Elemental Factory (sistema anterior).
--
-- Entran como productos de SOLO FACTURACIÓN (web = false): se usan en el
-- mostrador y en Inventario, y no aparecen en la tienda en línea.
-- Sin fotos y con existencias en cero; las cantidades se cargan por sede,
-- talla y color desde el panel.
--
-- Si se vuelve a ejecutar, actualiza tallas y colores en vez de duplicar.
-- ============================================================================

begin;

create temporary table _import (
  name text, category text, subcategory text, sizes jsonb, colors jsonb,
  retail numeric(10,2), wholesale numeric(10,2)
) on commit drop;

insert into _import (name, category, subcategory, sizes, colors, retail, wholesale) values
  ('FRANELA DAMA', 'women', 'franelas', '["S", "M", "L", "XL", "2XL", "3XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AMARILLO NEON", "AZUL OSCURO", "AZUL PETROLEO", "AZUL REY", "BEIGE", "BLANCO", "CAMU GRIS CLARO", "CAMU GRIS OSCURO", "CAMU VERDE MILITAR", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NARANJA", "NARANJA NEON", "NEGRO", "ROJO", "ROSADO", "ROSADO BARBIE", "ROSADO NEON", "SALMON", "TERRACOTA", "TURQUESA", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE NEON", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 10, 8.0),
  ('FRANELA CUELLO V', 'men', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BLANCO", "GRIS CLARO", "MOSTAZA", "NEGRO", "ROJO", "VERDE MILITAR"]'::jsonb, 10, 8.0),
  ('FRANELA CUELLO V DAMA', 'women', 'franelas', '["S", "M", "L", "XL"]'::jsonb, '["AMARILLO CLARO", "AZUL OSCURO", "AZUL REY", "BLANCO", "GRIS CLARO", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VINOTINTO"]'::jsonb, 0, 0),
  ('FRANELA MANGA LARGA', 'men', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL MARINO", "AZUL REY", "BLANCO", "GRIS CLARO", "GRIS OSCURO", "MOSTAZA", "NEGRO", "ROJO", "VERDE MILITAR", "VINOTINTO"]'::jsonb, 0, 0),
  ('FRANELA MANGA LARGA DAMA', 'women', 'franelas', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AZUL MARINO", "AZUL REY", "BLANCO", "GRIS CLARO", "GRIS OSCURO", "MOSTAZA", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VINOTINTO"]'::jsonb, 0, 0),
  ('FRANELA NIÑO', 'kids', 'franelas', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AMARILLO NEON", "AZUL OSCURO", "AZUL PETROLEO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NARANJA", "NARANJA NEON", "NEGRO", "ROJO", "ROSADO", "ROSADO NEON", "TURQUESA", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE NEON", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 0, 0),
  ('FRANELILLA CABALLERO', 'men', 'franelillas', '["S", "M", "L", "XL"]'::jsonb, '["BLANCO", "GRIS CLARO", "NEGRO", "ROJO", "VINOTINTO"]'::jsonb, 0, 0),
  ('FRANELILLA DAMA', 'women', 'franelillas', '["S", "M", "L", "XL"]'::jsonb, '["BLANCO", "GRIS CLARO", "NEGRO", "ROJO", "VINOTINTO"]'::jsonb, 0, 0),
  ('CHEMISE', 'men', 'chemises', '["S", "M", "L", "XL", "2XL", "3XL", "4XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AMARILLO FUERTE", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "GRIS JASPE CLARO", "GRIS JASPE OSCURO", "LADRILLO", "MOSTAZA", "NARANJA", "NEGRO", "PLOMO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 13, 10.4),
  ('CHEMISE MANGA LARGA', 'men', 'chemises', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BLANCO", "NEGRO", "ROJO", "VERDE NAVIDAD"]'::jsonb, 0, 0),
  ('CHEMISE DAMA', 'women', 'chemises', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "GRIS CLARO", "GRIS OSCURO", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD"]'::jsonb, 13, 10.4),
  ('CHEMISE NIÑO', 'kids', 'chemises', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["BLANCO", "NEGRO", "ROJO"]'::jsonb, 11, 8.8),
  ('JOGGER CABALLERO', 'men', 'joggers', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "AZUL MARINO", "AZUL REY", "BLANCO", "CAMU VERDE MILITAR", "GRIS CLARO", "GRIS OSCURO", "NEGRO", "ROJO", "VERDE MILITAR", "VERDE NAVIDAD", "VINOTINTO"]'::jsonb, 0, 0),
  ('JOGGER DAMA', 'women', 'joggers', '["S", "M", "L", "XL"]'::jsonb, '["AGUAMARINA", "AMARILLO CLARO", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CAMU GRIS CLARO", "CAMU GRIS OSCURO", "CAMU VERDE MILITAR", "CREMA", "FUCSIA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MORADO", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 0, 0),
  ('JOGGER NIÑO', 'kids', 'joggers', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AZUL OSCURO", "AZUL REY", "GRIS CLARO", "GRIS OSCURO", "LILA", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 0, 0),
  ('SHORT CABALLERO', 'men', 'shorts', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "BLANCO", "GRIS CLARO", "NEGRO", "ROJO"]'::jsonb, 0, 0),
  ('SHORT DAMA', 'women', 'shorts', '["S", "M", "L", "XL"]'::jsonb, '["AZUL OSCURO", "AZUL MARINO", "BEIGE", "BLANCO", "CELESTE", "CREMA", "GRIS CLARO", "GUAYABA", "LILA", "MARRON", "NEGRO", "ROJO", "ROSADO", "VERDE MILITAR"]'::jsonb, 0, 0),
  ('SUETER', 'men', 'sueteres', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["AMARILLO", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "CREMA", "GRIS CLARO", "GRIS OSCURO", "GUAYABA", "LILA", "MARRON", "MORADO", "MOSTAZA", "NEGRO", "ROJO", "ROSADO", "VERDE BOTELLA", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 0, 0),
  ('SUETER NIÑO', 'kids', 'sueteres', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AMARILLO", "AZUL OSCURO", "AZUL REY", "BEIGE", "BLANCO", "CELESTE", "FUCSIA", "GRIS CLARO", "GUAYABA", "LILA", "MOSTAZA", "NEGRO", "ROJO", "ROSADO", "VERDE NAVIDAD", "VERDE OLIVA", "VINOTINTO"]'::jsonb, 0, 0),
  ('OVERSIZE', 'men', 'oversize', '["S", "M", "L", "XL"]'::jsonb, '["AZUL REY", "BEIGE", "BLANCO", "CAMEL", "CREMA", "GRIS CLARO", "GUAYABA", "LILA", "MARRON", "NEGRO", "ROJO", "VERDE OLIVA"]'::jsonb, 0, 0),
  ('OVERSIZE ACANALADO', 'men', 'oversize', '["S", "M", "L", "XL"]'::jsonb, '["ACANALADO"]'::jsonb, 0, 0),
  ('OVERSIZE ACID WASH', 'men', 'oversize', '["S", "M", "L", "XL", "2XL"]'::jsonb, '["ACID WASH"]'::jsonb, 0, 0),
  ('BODY', 'kids', 'bodies', '["2-4", "6-8", "10-12", "14-16"]'::jsonb, '["AMARILLO CLARO", "AZUL OSCURO", "AZUL REY", "BLANCO", "CELESTE", "GRIS CLARO", "LILA", "NEGRO", "ROJO", "ROSADO", "VERDE NAVIDAD", "VINOTINTO"]'::jsonb, 10, 8.0),
  ('LEGGINS', 'women', 'leggins', '["S", "M", "L", "XL"]'::jsonb, '[]'::jsonb, 0, 0),
  ('BERMUDAS', 'men', 'bermudas', '["30", "32", "34", "36", "38"]'::jsonb, '[]'::jsonb, 0, 0),
  ('HOODIE', 'men', 'hoodies', '["4XL"]'::jsonb, '["AMARILLO FUERTE", "BLANCO", "CELESTE", "GRIS CLARO", "NEGRO", "ROSADO"]'::jsonb, 0, 0),
  ('CHAQUETA', 'men', 'chaquetas', '["S", "M", "XL", "10-12", "14-16"]'::jsonb, '["AZUL OSCURO", "NEGRO"]'::jsonb, 26, 20.8),
  ('CROP TOP HOLGADO', 'women', 'crop tops', '["HOLGADO"]'::jsonb, '[]'::jsonb, 0, 0),
  ('MEDIAS', 'men', 'accesorios', '[]'::jsonb, '[]'::jsonb, 0, 0),
  ('TULA', 'men', 'accesorios', '[]'::jsonb, '[]'::jsonb, 0, 0);

insert into public.products (name, category, subcategory, description, retail_price, wholesale_price,
                             image, images, sizes, colors, color_palette, stock, min_stock,
                             allow_custom, featured, trending, web)
select i.name, i.category, i.subcategory, '', i.retail, i.wholesale,
       '', '[]'::jsonb, i.sizes, i.colors, '[]'::jsonb, 0, 0,
       false, false, false, false
  from _import i
 where not exists (select 1 from public.products p where upper(p.name) = upper(i.name));

update public.products p
   set sizes = i.sizes, colors = i.colors, subcategory = i.subcategory, category = i.category,
       retail_price = case when p.retail_price > 0 then p.retail_price else i.retail end,
       wholesale_price = case when p.wholesale_price > 0 then p.wholesale_price else i.wholesale end,
       updated_at = now()
  from _import i
 where upper(p.name) = upper(i.name) and p.web = false;

commit;

select count(*) || ' productos de facturación en el catálogo' from public.products where web = false;
