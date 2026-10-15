-- ============================================================================
-- Costos unitarios del formato de rentabilidad de septiembre 2026.
-- Los costos son iguales en las cinco sedes, asi que se guarda uno por producto.
-- Sin acentos a proposito: el editor de Supabase los corrompe al pegar.
-- Repetirlo deja lo mismo.
-- ============================================================================

begin;

create temporary table _costo (producto text, costo numeric(10,2)) on commit drop;

insert into _costo (producto, costo) values
  ('CHEMISE', 8.0),
  ('CHEMISE DAMA', 8.0),
  ('CHEMISE MANGA LRG', 8.0),
  ('CHEMISE NINO', 8.0),
  ('FRANELA UNISEX', 4.2),
  ('FRANELA DAMA', 3.8),
  ('FRANELA NINO', 6.5),
  ('JOGGER CABALLERO', 8.0),
  ('JOGGER DAMA', 8.0),
  ('JOGGER NINO', 8.0),
  ('SUETER', 12.0),
  ('SUETER NINO', 12.0),
  ('HOODIE', 15.0),
  ('HOODIE NINO', 15.0),
  ('CHAQUETA', 16.0),
  ('CHAQUETA NINO', 16.0),
  ('OVERSIZE', 6.5),
  ('SHORT CABALLERO', 6.5),
  ('SHORT DAMA', 6.5),
  ('BERMUDAS', 6.5),
  ('FRANELA CUELLO V', 4.8),
  ('FRANELA CUELLO V DAMA', 4.8),
  ('CROP TOP', 4.2),
  ('MICRODURAZNO', 3.5),
  ('FRANELILLA CABALLERO', 4.2),
  ('FRANELILLA DAMA', 4.2),
  ('GORRAS', 3.15),
  ('BODY NINO', 3.0),
  ('FRANELA MANGA LRG', 5.5),
  ('FRANELA MANGA LRG DAMA', 5.5),
  ('TULA', 5.5);

insert into public.product_costs (product_id, cost)
select p.id, c.costo
  from _costo c
  join public.products p
    on not p.web
   and public.norm_name(p.name) in (public.norm_name(c.producto),
                                    public.norm_name(c.producto) || 'FACTURACION')
on conflict (product_id) do update set cost = excluded.cost, updated_at = now();

commit;

select count(*) || ' productos con costo' as cargados
  from public.product_costs c join public.products p on p.id = c.product_id where not p.web and c.cost > 0;

-- Los que quedan sin costo, para ponerlos a mano.
select coalesce(string_agg(p.name, ', ' order by p.name), 'ninguno') as sin_costo
  from public.products p
 where not p.web
   and not exists (select 1 from public.product_costs c where c.product_id = p.id and c.cost > 0);
