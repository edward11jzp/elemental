-- Solo consulta (no cambia nada): compara precios de "solo facturacion" con la tienda en linea.
select f.name as facturacion, f.retail_price as detal_fact, f.wholesale_price as mayor_fact,
       w.name as tienda, w.retail_price as detal_web, w.wholesale_price as mayor_web
  from public.products f
  left join public.products w
    on w.web is distinct from false
   and (public.norm_name(w.name) = public.norm_name(f.name)
        or public.norm_name(w.name) || 'FACTURACION' = public.norm_name(f.name))
 where f.web = false
 order by (w.id is null), f.name;
