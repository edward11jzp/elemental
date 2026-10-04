-- ============================================================================
-- Codigos (SKU) del sistema anterior para el catalogo de facturacion.
-- Sin acentos a proposito: el editor de Supabase los corrompe al pegar.
-- Repetirlo deja lo mismo.
-- ============================================================================

begin;

create temporary table _sku (producto text, base text, por_talla jsonb) on commit drop;

insert into _sku (producto, base, por_talla) values
  ('BERMUDAS', 'BM', '{"32": "BM", "36": "BM", "38": "BM"}'::jsonb),
  ('BODY NINO', 'BDY', '{"10-12": "BDY10", "2-4": "BDY2", "6-8": "BDY6", "14-16": "BDY14"}'::jsonb),
  ('CHAQUETA', 'CHQ', '{"M": "CHQM", "S": "CHQS", "XL": "CHQXL", "2XL": "CHQ2XL", "L": "CHQL"}'::jsonb),
  ('CHAQUETA NINO', 'CHQ', '{"10-12": "CHQ10", "14-16": "CHQ14", "2-6": "CHQ2", "6-8": "CHQ6"}'::jsonb),
  ('CHEMISE', 'CH', '{"2XL": "CH2XL", "3XL": "CH3XL", "4XL": "CH4XL", "L": "CHL", "M": "CHM", "S": "CHS", "XL": "CHXL"}'::jsonb),
  ('CHEMISE DAMA', 'CHD', '{"L": "CHDL", "M": "CHDM", "S": "CHDS", "XL": "CHDXL"}'::jsonb),
  ('CHEMISE MANGA LRG', 'CHML', '{"L": "CHMLL", "M": "CHMLM", "S": "CHMLS", "XL": "CHMLXL"}'::jsonb),
  ('CHEMISE NINO', 'CHN', '{"14-16": "CHN14", "10-12": "CHN10", "2-4": "CHN2", "6-8": "CHN6"}'::jsonb),
  ('CROP TOP', 'CTP', '{"": "CTP"}'::jsonb),
  ('FRANELA CUELLO V', 'FV', '{"L": "FVL", "XL": "FVXL", "2XL": "FV2XL", "M": "FVM", "S": "FVS"}'::jsonb),
  ('FRANELA CUELLO V DAMA', 'FVD', '{"L": "FVDL", "XL": "FVDXL", "M": "FVDM", "S": "FVDS"}'::jsonb),
  ('FRANELA DAMA', 'FD', '{"2XL": "FD2XL", "3XL": "FD3XL", "L": "FDL", "M": "FDM", "S": "FDS", "XL": "FDXL"}'::jsonb),
  ('FRANELA MANGA LRG', 'FML', '{"2XL": "FML2XL", "L": "FMLL", "M": "FMLM", "S": "FMLS", "XL": "FMLXL"}'::jsonb),
  ('FRANELA MANGA LRG DAMA', 'FMLD', '{"L": "FMLDL", "M": "FMLDM", "S": "FMLDS", "XL": "FMLDXL", "2XL": "FMLD2XL"}'::jsonb),
  ('FRANELA NINO', 'FN', '{"10-12": "FN10", "14-16": "FN14", "2-4": "FN2", "6-8": "FN6"}'::jsonb),
  ('FRANELA UNISEX', 'FU', '{"2XL": "FU2XL", "3XL": "FU3XL", "4XL": "FU4XL", "L": "FUL", "M": "FUM", "S": "FUS", "XL": "FUXL"}'::jsonb),
  ('FRANELILLA CABALLERO', 'FLC', '{"L": "FLCL", "S": "FLCS", "M": "FLCM", "XL": "FLCXL"}'::jsonb),
  ('FRANELILLA DAMA', 'FLD', '{"M": "FLDM", "S": "FLDS", "XL": "FLDXL"}'::jsonb),
  ('GORRAS', 'GR', '{"": "GR"}'::jsonb),
  ('HOODIE', 'HD', '{"2XL": "HD2XL", "L": "HDL", "M": "HDM", "S": "HDS", "XL": "HDXL", "3XL": "HD3XL", "4XL": "HD4XL"}'::jsonb),
  ('HOODIE NINO', 'HD', '{"10-12": "HD10", "6-8": "HD6", "14-16": "HD14", "2-4": "HD2"}'::jsonb),
  ('JOGGER CABALLERO', 'JC', '{"L": "JCL", "M": "JCM", "S": "JCS", "XL": "JCXL"}'::jsonb),
  ('JOGGER DAMA', 'JD', '{"L": "JDL", "M": "JDM", "S": "JDS", "XL": "JDXL"}'::jsonb),
  ('JOGGER NINO', 'JN', '{"10-12": "JN10", "14-16": "JN14", "2-4": "JN2", "6-8": "JN6"}'::jsonb),
  ('LEGGINS', 'LG', '{"L": "LG", "M": "LG", "S": "LG", "XL": "LG"}'::jsonb),
  ('MEDIAS', 'MDS', '{"": "MDS"}'::jsonb),
  ('MICRODURAZNO', 'MDZ', '{"S": "MDZ", "L": "MDZ", "XL": "MDZ"}'::jsonb),
  ('OVERSIZE', 'OVZ', '{"2XL": "OVZAW", "L": "OVZL", "M": "OVZM", "S": "OVZS", "XL": "OVZXL"}'::jsonb),
  ('SHORT CABALLERO', 'SHC', '{"M": "SHCM", "L": "SHCL", "S": "SHCS", "XL": "SHCXL"}'::jsonb),
  ('SHORT DAMA', 'SHD', '{"M": "SHDM", "S": "SHDS", "L": "SHDL", "XL": "SHDXL"}'::jsonb),
  ('SUETER', 'ST', '{"2XL": "ST2XL", "4XL": "ST4XL", "L": "STL", "M": "STM", "S": "STS", "XL": "STXL", "3XL": "ST3XL"}'::jsonb),
  ('SUETER NINO', 'ST', '{"10-12": "ST10", "14-16": "ST14", "2-4": "ST2", "6-8": "ST6"}'::jsonb),
  ('TULA', 'TLA', '{"": "TLA"}'::jsonb),
  ('VESTIDO', 'VT', '{"S": "VT", "L": "VT", "M": "VT"}'::jsonb);

update public.products p
   set sku = s.base, sku_sizes = s.por_talla, updated_at = now()
  from _sku s
 where not p.web
   and public.norm_name(p.name) in (public.norm_name(s.producto),
                                    public.norm_name(s.producto) || 'FACTURACION');

commit;

select count(*) || ' productos con codigo' from public.products where not web and sku <> '';
