-- =====================================================
-- TRADES & COST CODES DATA DUMP
-- Forma Workforce OS
-- Generated: 2025-12-09
-- =====================================================
-- Run this after creating the schema tables.
-- Trades must be inserted before cost_codes due to FK.
-- =====================================================

-- =====================================================
-- TRADES
-- =====================================================
INSERT INTO public.trades (id, name, description, created_at) VALUES
('d144f3ca-c633-464d-8a16-a02888452a34', 'Appliances Install', 'Install of appliances, specialty fixtures', '2025-11-23 04:01:00.149499+00'),
('174b3fb8-1b4b-41f4-b4fc-a214ea167849', 'Cabinets & Millwork', 'Custom and semi-custom cabinetry, millwork', '2025-11-23 04:00:50.573843+00'),
('c0410c73-169a-406b-999b-4f3017b4e1f8', 'Concrete & Foundations', 'Footings, slabs, foundations, flatwork', '2025-11-23 04:00:37.164642+00'),
('970ddbda-fb86-48c8-8df4-75cdebb7bb2b', 'Countertops', 'Stone, quartz, solid surface, installation', '2025-11-23 04:00:51.636302+00'),
('fb8d3e74-99a6-4c6f-840f-c783c01951cb', 'Demolition', 'Selective and structural demolition, haul-off', '2025-11-23 04:00:36.172972+00'),
('391a7bc6-8cf5-4ff0-a383-d6306f60fad7', 'Drywall & Taping', 'Board, tape, mud, texture', '2025-11-23 04:00:46.3906+00'),
('420002b2-7c3b-4e13-a3a2-c83929c4f7e3', 'Electrical', 'Rough and finish electrical', '2025-11-23 04:00:54.773797+00'),
('36ff62c8-0bec-4773-aca8-af8c52a664ca', 'Exterior Cladding', 'Stucco, siding, exterior trim and façade systems', '2025-11-23 04:00:44.303261+00'),
('ca3057fd-50ab-44c0-965c-6ebff26b45ed', 'Fencing & Gates', 'Site fencing, gates, railings', '2025-11-23 04:00:58.335234+00'),
('1a79f182-968d-4ea7-81b9-813b53abb300', 'Flooring', 'Hardwood, engineered, LVP, carpet, underlayments', '2025-11-23 04:00:49.534839+00'),
('80cd60ae-98c8-42ad-8bf1-094ac1e68a59', 'Framing & Rough Carpentry', 'Structural framing, blocking, sheathing', '2025-11-23 04:00:38.62119+00'),
('57852661-46ac-4ee1-b201-e2009bcdf6b5', 'General Conditions', 'Supervision, project management, temp facilities', '2025-11-23 04:01:01.04318+00'),
('592d3b8d-062c-403f-b533-85496f8e1d72', 'Glass & Shower Enclosures', 'Glass railings, shower doors, mirrors', '2025-11-23 04:00:56.507602+00'),
('6519c85e-13d7-4b55-aeaf-5d7a6dddca85', 'HVAC', 'Heating, cooling, ventilation', '2025-11-23 04:00:53.734752+00'),
('e209539c-3051-4bb9-b160-b76de9ed59a5', 'Insulation', 'Thermal and acoustic insulation', '2025-11-23 04:00:45.340317+00'),
('035be548-b76f-4f07-ab80-655ac7040136', 'Interior Painting', 'Interior paint, stain, coatings', '2025-11-23 04:00:47.442529+00'),
('ef72fce6-5356-4cc2-b52e-c8c1bbe67220', 'Landscaping', 'Exterior landscape, irrigation, pavers, site walls', '2025-11-23 04:00:57.409376+00'),
('7e5fa65f-c1e0-4b48-9a74-a0b88f1d4b1c', 'Low Voltage', 'Data, AV, security, low-voltage wiring and devices', '2025-11-23 04:00:55.650827+00'),
('0ad49c2c-89c9-40f3-95aa-3a4c0a5e8b7d', 'Plumbing', 'Rough and finish plumbing', '2025-11-23 04:00:52.890123+00'),
('a1b2c3d4-e5f6-4789-abcd-ef0123456789', 'Pools & Spas', 'Pool/spa construction and equipment', '2025-11-23 04:00:59.123456+00'),
('c7d8e9f0-1234-5678-9abc-def012345678', 'Roofing', 'Roofing systems and related flashings', '2025-11-23 04:00:42.567890+00'),
('09876543-21fe-dcba-9876-543210fedcba', 'Structural Steel', 'Structural steel, moment frames, lintels', '2025-11-23 04:00:39.876543+00'),
('fedcba98-7654-3210-fedc-ba9876543210', 'Tile & Stone', 'Floor and wall tile, stone, shower pans', '2025-11-23 04:00:48.234567+00'),
('abcd1234-5678-90ab-cdef-1234567890ab', 'Waterproofing', 'Membranes, deck and wall waterproofing, below-grade systems', '2025-11-23 04:00:40.345678+00'),
('12345678-90ab-cdef-1234-567890abcdef', 'Windows & Exterior Doors', 'Supply and install windows, sliders, exterior doors', '2025-11-23 04:00:43.456789+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COST CODES
-- =====================================================
INSERT INTO public.cost_codes (id, code, name, category, trade_id, is_active, created_at) VALUES
-- Appliances Install
('5ae6636f-a163-4924-b9b5-2a6cea5a14dc', 'APPL-L', 'Labor – Appliances Install', 'labor', 'd144f3ca-c633-464d-8a16-a02888452a34', true, '2025-11-23 04:01:00.360289+00'),
('44d56303-f1b9-4640-9379-e06690b6a724', 'APPL-M', 'Materials – Appliances Install', 'materials', 'd144f3ca-c633-464d-8a16-a02888452a34', true, '2025-11-23 04:01:00.360289+00'),
('4c89f37f-f672-4a15-85fb-1d099d36a32e', 'APPL-S', 'Subcontract – Appliances Install', 'subs', 'd144f3ca-c633-464d-8a16-a02888452a34', true, '2025-11-23 04:01:00.360289+00'),

-- Cabinets & Millwork
('fd225d27-fb5a-42ba-aff4-a1a8180e19eb', 'CAB-L', 'Labor – Cabinets & Millwork', 'labor', '174b3fb8-1b4b-41f4-b4fc-a214ea167849', true, '2025-11-23 04:00:50.778869+00'),
('5ed04041-b7d9-49b5-94a7-181203d905bd', 'CAB-M', 'Materials – Cabinets & Millwork', 'materials', '174b3fb8-1b4b-41f4-b4fc-a214ea167849', true, '2025-11-23 04:00:50.778869+00'),
('14f704ce-c9aa-4504-9ee3-f9024bca125f', 'CAB-S', 'Subcontract – Cabinets & Millwork', 'subs', '174b3fb8-1b4b-41f4-b4fc-a214ea167849', true, '2025-11-23 04:00:50.778869+00'),

-- Concrete & Foundations
('583a59f4-a722-4c1d-aa6c-00f312d35e89', 'CONC-L', 'Labor – Concrete & Foundations', 'labor', 'c0410c73-169a-406b-999b-4f3017b4e1f8', true, '2025-11-23 04:00:37.567368+00'),
('70386019-d138-4e3a-948a-2049e2a73521', 'CONC-M', 'Materials – Concrete & Foundations', 'materials', 'c0410c73-169a-406b-999b-4f3017b4e1f8', true, '2025-11-23 04:00:37.567368+00'),
('b500170e-0c2f-4ca9-9eea-3383941aff04', 'CONC-S', 'Subcontract – Concrete & Foundations', 'subs', 'c0410c73-169a-406b-999b-4f3017b4e1f8', true, '2025-11-23 04:00:37.567368+00'),

-- Countertops
('83e28153-9e06-4398-8ca2-eb98f8694785', 'TOPS-L', 'Labor – Countertops', 'labor', '970ddbda-fb86-48c8-8df4-75cdebb7bb2b', true, '2025-11-23 04:00:51.778869+00'),
('f1234567-89ab-cdef-0123-456789abcdef', 'TOPS-M', 'Materials – Countertops', 'materials', '970ddbda-fb86-48c8-8df4-75cdebb7bb2b', true, '2025-11-23 04:00:51.778869+00'),
('ba661c37-67b4-4b22-a2be-3607ee68d011', 'TOPS-S', 'Subcontract – Countertops', 'subs', '970ddbda-fb86-48c8-8df4-75cdebb7bb2b', true, '2025-11-23 04:00:51.778869+00'),

-- Demolition
('a4bb517e-d100-4035-ab8d-3e51832564ff', 'DEMO-L', 'Labor – Demolition', 'labor', 'fb8d3e74-99a6-4c6f-840f-c783c01951cb', true, '2025-11-23 04:00:36.440682+00'),
('2d76b27d-8a38-4609-9d0c-468d415f1190', 'DEMO-M', 'Materials – Demolition', 'materials', 'fb8d3e74-99a6-4c6f-840f-c783c01951cb', true, '2025-11-23 04:00:36.440682+00'),
('dd16aaf1-f10a-442b-ba65-5ced8e73c2e6', 'DEMO-S', 'Subcontract – Demolition', 'subs', 'fb8d3e74-99a6-4c6f-840f-c783c01951cb', true, '2025-11-23 04:00:36.440682+00'),

-- Drywall & Taping
('442655fc-fd22-4e5c-aaeb-44bb54ec7935', 'DRYW-L', 'Labor – Drywall & Taping', 'labor', '391a7bc6-8cf5-4ff0-a383-d6306f60fad7', true, '2025-11-23 04:00:46.608371+00'),
('9435eede-e8c7-4560-9ab4-630fc5d0620e', 'DRYW-M', 'Materials – Drywall & Taping', 'materials', '391a7bc6-8cf5-4ff0-a383-d6306f60fad7', true, '2025-11-23 04:00:46.608371+00'),
('511023ab-c4e7-4355-8f36-c0efa682f92b', 'DRYW-S', 'Subcontract – Drywall & Taping', 'subs', '391a7bc6-8cf5-4ff0-a383-d6306f60fad7', true, '2025-11-23 04:00:46.608371+00'),

-- Electrical
('c513c676-8d79-4661-876d-18cf3410663c', 'ELEC-L', 'Labor – Electrical', 'labor', '420002b2-7c3b-4e13-a3a2-c83929c4f7e3', true, '2025-11-23 04:00:54.96289+00'),
('4fe30f81-2d5a-4f32-93b1-ff37bb69bb99', 'ELEC-M', 'Materials – Electrical', 'materials', '420002b2-7c3b-4e13-a3a2-c83929c4f7e3', true, '2025-11-23 04:00:54.96289+00'),
('6a392c95-d4ac-4122-9618-a52b1da42f37', 'ELEC-S', 'Subcontract – Electrical', 'subs', '420002b2-7c3b-4e13-a3a2-c83929c4f7e3', true, '2025-11-23 04:00:54.96289+00'),

-- Exterior Cladding
('7375de06-173c-4b25-bef1-3093393b798a', 'EXT-L', 'Labor – Exterior Cladding', 'labor', '36ff62c8-0bec-4773-aca8-af8c52a664ca', true, '2025-11-23 04:00:44.516652+00'),
('a7545254-d4e9-4964-ad82-e3e484937b2b', 'EXT-M', 'Materials – Exterior Cladding', 'materials', '36ff62c8-0bec-4773-aca8-af8c52a664ca', true, '2025-11-23 04:00:44.516652+00'),
('b8656365-e5fa-5075-be93-f4f595048b3c', 'EXT-S', 'Subcontract – Exterior Cladding', 'subs', '36ff62c8-0bec-4773-aca8-af8c52a664ca', true, '2025-11-23 04:00:44.516652+00'),

-- Fencing & Gates
('efc1a225-afef-40cc-b0ef-18e97f3c9dcf', 'FENCE-L', 'Labor – Fencing & Gates', 'labor', 'ca3057fd-50ab-44c0-965c-6ebff26b45ed', true, '2025-11-23 04:00:58.567890+00'),
('7fc2b336-bfef-51dd-c1f0-29f08f4d0de0', 'FENCE-M', 'Materials – Fencing & Gates', 'materials', 'ca3057fd-50ab-44c0-965c-6ebff26b45ed', true, '2025-11-23 04:00:58.567890+00'),
('8d474ff8-3472-4f69-b675-ec8e2563b922', 'FENCE-S', 'Subcontract – Fencing & Gates', 'subs', 'ca3057fd-50ab-44c0-965c-6ebff26b45ed', true, '2025-11-23 04:00:58.567890+00'),

-- Flooring
('328cde72-5de4-4f69-b97f-5aef06ce975b', 'FLR-L', 'Labor – Flooring', 'labor', '1a79f182-968d-4ea7-81b9-813b53abb300', true, '2025-11-23 04:00:49.778869+00'),
('439def83-6ef5-5080-c0a8-6bf017df086c', 'FLR-M', 'Materials – Flooring', 'materials', '1a79f182-968d-4ea7-81b9-813b53abb300', true, '2025-11-23 04:00:49.778869+00'),
('1ddce923-be39-4e94-acb8-2d608e0d1e08', 'FLR-S', 'Subcontract – Flooring', 'subs', '1a79f182-968d-4ea7-81b9-813b53abb300', true, '2025-11-23 04:00:49.778869+00'),

-- Framing & Rough Carpentry
('2a6ede5b-36bc-4f24-95d5-3c8ec332536f', 'FRAM-L', 'Labor – Framing & Rough Carpentry', 'labor', '80cd60ae-98c8-42ad-8bf1-094ac1e68a59', true, '2025-11-23 04:00:38.867890+00'),
('3b7fef6c-47cd-5035-a6e6-4d9fd443647f', 'FRAM-M', 'Materials – Framing & Rough Carpentry', 'materials', '80cd60ae-98c8-42ad-8bf1-094ac1e68a59', true, '2025-11-23 04:00:38.867890+00'),
('a851b435-e2c0-4f82-99e3-27c85c922842', 'FRAM-S', 'Subcontract – Framing & Rough Carpentry', 'subs', '80cd60ae-98c8-42ad-8bf1-094ac1e68a59', true, '2025-11-23 04:00:38.867890+00'),

-- General Conditions
('6f1fd231-a6de-4a9d-acfb-81bd50199802', 'GC-L', 'Labor – General Conditions', 'labor', '57852661-46ac-4ee1-b201-e2009bcdf6b5', true, '2025-11-23 04:01:01.267890+00'),
('702e0342-b7ef-5bae-bdfc-92ce61200913', 'GC-M', 'Materials – General Conditions', 'materials', '57852661-46ac-4ee1-b201-e2009bcdf6b5', true, '2025-11-23 04:01:01.267890+00'),
('d496c7c3-a2ec-4e1c-8524-309c4fe9831e', 'GC-S', 'Subcontract – General Conditions', 'subs', '57852661-46ac-4ee1-b201-e2009bcdf6b5', true, '2025-11-23 04:01:01.267890+00'),

-- Glass & Shower Enclosures
('c7d875a1-8e64-46c6-b753-639ac1b9971d', 'GLASS-L', 'Labor – Glass & Shower Enclosures', 'labor', '592d3b8d-062c-403f-b533-85496f8e1d72', true, '2025-11-23 04:00:56.778869+00'),
('d8e986b2-9f75-57d7-c864-74ab2c0a082e', 'GLASS-M', 'Materials – Glass & Shower Enclosures', 'materials', '592d3b8d-062c-403f-b533-85496f8e1d72', true, '2025-11-23 04:00:56.778869+00'),
('25ca7e3a-b836-4583-bf82-f62bb1f3b040', 'GLASS-S', 'Subcontract – Glass & Shower Enclosures', 'subs', '592d3b8d-062c-403f-b533-85496f8e1d72', true, '2025-11-23 04:00:56.778869+00'),

-- HVAC
('4641f679-de8d-44cd-9ef1-b7941d52cff3', 'HVAC-L', 'Labor – HVAC', 'labor', '6519c85e-13d7-4b55-aeaf-5d7a6dddca85', true, '2025-11-23 04:00:53.96289+00'),
('575278a-ef9e-55de-a0f2-c8a52e63d004', 'HVAC-M', 'Materials – HVAC', 'materials', '6519c85e-13d7-4b55-aeaf-5d7a6dddca85', true, '2025-11-23 04:00:53.96289+00'),
('872d12d1-a7bd-4691-a8cf-87dac25c8b30', 'HVAC-S', 'Subcontract – HVAC', 'subs', '6519c85e-13d7-4b55-aeaf-5d7a6dddca85', true, '2025-11-23 04:00:53.96289+00'),

-- Insulation
('d691b110-ab11-4dd5-b457-0e6af723208c', 'INSL-L', 'Labor – Insulation', 'labor', 'e209539c-3051-4bb9-b160-b76de9ed59a5', true, '2025-11-23 04:00:45.567890+00'),
('e7a2c221-bc22-5ee6-c568-1f7b0834319d', 'INSL-M', 'Materials – Insulation', 'materials', 'e209539c-3051-4bb9-b160-b76de9ed59a5', true, '2025-11-23 04:00:45.567890+00'),
('d1887bc8-e434-439b-b406-2d4587952f9e', 'INSL-S', 'Subcontract – Insulation', 'subs', 'e209539c-3051-4bb9-b160-b76de9ed59a5', true, '2025-11-23 04:00:45.567890+00'),

-- Interior Painting
('4fe86482-3126-491e-ae2b-24e6d598b343', 'PAINT-L', 'Labor – Interior Painting', 'labor', '035be548-b76f-4f07-ab80-655ac7040136', true, '2025-11-23 04:00:47.678901+00'),
('50f97593-4237-5a2f-bf3c-35f7e6a9c454', 'PAINT-M', 'Materials – Interior Painting', 'materials', '035be548-b76f-4f07-ab80-655ac7040136', true, '2025-11-23 04:00:47.678901+00'),
('9ac1e73f-fe7c-4227-acf9-82065fbeb379', 'PAINT-S', 'Subcontract – Interior Painting', 'subs', '035be548-b76f-4f07-ab80-655ac7040136', true, '2025-11-23 04:00:47.678901+00'),

-- Landscaping
('18fe5d70-1df0-4c63-868e-bc6a46513058', 'LAND-L', 'Labor – Landscaping', 'labor', 'ef72fce6-5356-4cc2-b52e-c8c1bbe67220', true, '2025-11-23 04:00:57.567890+00'),
('290f6e81-2e01-5d74-979f-cd7b57624169', 'LAND-M', 'Materials – Landscaping', 'materials', 'ef72fce6-5356-4cc2-b52e-c8c1bbe67220', true, '2025-11-23 04:00:57.567890+00'),
('8aeaf4d4-e6fb-4abe-b578-e55627e6bf34', 'LAND-S', 'Subcontract – Landscaping', 'subs', 'ef72fce6-5356-4cc2-b52e-c8c1bbe67220', true, '2025-11-23 04:00:57.567890+00'),

-- Low Voltage
('3a107f92-3f12-6e85-a8a0-de8c68735270', 'LV-L', 'Labor – Low Voltage', 'labor', '7e5fa65f-c1e0-4b48-9a74-a0b88f1d4b1c', true, '2025-11-23 04:00:55.867890+00'),
('4b218003-4023-7f96-b9b1-ef9d79846381', 'LV-M', 'Materials – Low Voltage', 'materials', '7e5fa65f-c1e0-4b48-9a74-a0b88f1d4b1c', true, '2025-11-23 04:00:55.867890+00'),
('5c329114-5134-80a7-cac2-f0ae8a957492', 'LV-S', 'Subcontract – Low Voltage', 'subs', '7e5fa65f-c1e0-4b48-9a74-a0b88f1d4b1c', true, '2025-11-23 04:00:55.867890+00'),

-- Plumbing
('6d43a225-6245-91b8-dbd3-01bf9b068503', 'PLUM-L', 'Labor – Plumbing', 'labor', '0ad49c2c-89c9-40f3-95aa-3a4c0a5e8b7d', true, '2025-11-23 04:00:52.96289+00'),
('7e54b336-7356-a2c9-ece4-12c0ac179614', 'PLUM-M', 'Materials – Plumbing', 'materials', '0ad49c2c-89c9-40f3-95aa-3a4c0a5e8b7d', true, '2025-11-23 04:00:52.96289+00'),
('8f65c447-8467-b3da-fdf5-23d1bd28a725', 'PLUM-S', 'Subcontract – Plumbing', 'subs', '0ad49c2c-89c9-40f3-95aa-3a4c0a5e8b7d', true, '2025-11-23 04:00:52.96289+00'),

-- Pools & Spas
('9076d558-9578-c4eb-0e06-34e2ce39b836', 'POOL-L', 'Labor – Pools & Spas', 'labor', 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', true, '2025-11-23 04:00:59.267890+00'),
('a187e669-a689-d5fc-1f17-45f3df4ac947', 'POOL-M', 'Materials – Pools & Spas', 'materials', 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', true, '2025-11-23 04:00:59.267890+00'),
('b298f77a-b79a-e60d-2028-560e0e5bd058', 'POOL-S', 'Subcontract – Pools & Spas', 'subs', 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', true, '2025-11-23 04:00:59.267890+00'),

-- Roofing
('c3a9088b-c8ab-f71e-3139-671f1f6ce169', 'ROOF-L', 'Labor – Roofing', 'labor', 'c7d8e9f0-1234-5678-9abc-def012345678', true, '2025-11-23 04:00:42.778869+00'),
('d4ba199c-d9bc-082f-4240-782020d7f27a', 'ROOF-M', 'Materials – Roofing', 'materials', 'c7d8e9f0-1234-5678-9abc-def012345678', true, '2025-11-23 04:00:42.778869+00'),
('e5cb2aad-eacd-193f-5351-893131e80f8b', 'ROOF-S', 'Subcontract – Roofing', 'subs', 'c7d8e9f0-1234-5678-9abc-def012345678', true, '2025-11-23 04:00:42.778869+00'),

-- Structural Steel
('f6dc3bbe-fbde-2a40-6462-9a4242f9109c', 'STEEL-L', 'Labor – Structural Steel', 'labor', '09876543-21fe-dcba-9876-543210fedcba', true, '2025-11-23 04:00:40.067890+00'),
('07ed4ccf-0cef-3b51-7573-ab5353fa21ad', 'STEEL-M', 'Materials – Structural Steel', 'materials', '09876543-21fe-dcba-9876-543210fedcba', true, '2025-11-23 04:00:40.067890+00'),
('18fe5dd0-1df0-4c62-8684-bc6464fb32be', 'STEEL-S', 'Subcontract – Structural Steel', 'subs', '09876543-21fe-dcba-9876-543210fedcba', true, '2025-11-23 04:00:40.067890+00'),

-- Tile & Stone
('290f6ee1-2e01-5d73-9795-cd75750c43cf', 'TILE-L', 'Labor – Tile & Stone', 'labor', 'fedcba98-7654-3210-fedc-ba9876543210', true, '2025-11-23 04:00:48.467890+00'),
('3a1070f2-3f12-6e84-a8a6-de86861d54d0', 'TILE-M', 'Materials – Tile & Stone', 'materials', 'fedcba98-7654-3210-fedc-ba9876543210', true, '2025-11-23 04:00:48.467890+00'),
('4b2181f3-4023-7f95-b9b7-ef97972e65e1', 'TILE-S', 'Subcontract – Tile & Stone', 'subs', 'fedcba98-7654-3210-fedc-ba9876543210', true, '2025-11-23 04:00:48.467890+00'),

-- Waterproofing
('5c329204-5134-80a6-cac8-f0a8a83f76f2', 'WPF-L', 'Labor – Waterproofing', 'labor', 'abcd1234-5678-90ab-cdef-1234567890ab', true, '2025-11-23 04:00:40.567890+00'),
('6d43a315-6245-91b7-dbd9-01b9b94087f3', 'WPF-M', 'Materials – Waterproofing', 'materials', 'abcd1234-5678-90ab-cdef-1234567890ab', true, '2025-11-23 04:00:40.567890+00'),
('7e54b426-7356-a2c8-ece0-12c0ca519804', 'WPF-S', 'Subcontract – Waterproofing', 'subs', 'abcd1234-5678-90ab-cdef-1234567890ab', true, '2025-11-23 04:00:40.567890+00'),

-- Windows & Exterior Doors
('8f65c537-8467-b3d9-fdf1-23d1dd62a915', 'WD-L', 'Labor – Windows & Exterior Doors', 'labor', '12345678-90ab-cdef-1234-567890abcdef', true, '2025-11-23 04:00:43.678901+00'),
('9076d648-9578-c4ea-0e02-34e2ee73ba26', 'WD-M', 'Materials – Windows & Exterior Doors', 'materials', '12345678-90ab-cdef-1234-567890abcdef', true, '2025-11-23 04:00:43.678901+00'),
('a187e759-a689-d5fb-1f13-45f3ff84cb37', 'WD-S', 'Subcontract – Windows & Exterior Doors', 'subs', '12345678-90ab-cdef-1234-567890abcdef', true, '2025-11-23 04:00:43.678901+00'),

-- UNASSIGNED (fallback cost code)
('00000000-0000-0000-0000-000000000000', 'UNASSIGNED', 'Unassigned / Miscellaneous', 'other', NULL, true, '2025-11-23 04:00:00.000000+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UPDATE TRADES WITH DEFAULT COST CODE REFERENCES
-- =====================================================
UPDATE public.trades SET default_labor_cost_code_id = '5ae6636f-a163-4924-b9b5-2a6cea5a14dc', default_sub_cost_code_id = '4c89f37f-f672-4a15-85fb-1d099d36a32e' WHERE id = 'd144f3ca-c633-464d-8a16-a02888452a34';
UPDATE public.trades SET default_labor_cost_code_id = 'fd225d27-fb5a-42ba-aff4-a1a8180e19eb', default_sub_cost_code_id = '14f704ce-c9aa-4504-9ee3-f9024bca125f' WHERE id = '174b3fb8-1b4b-41f4-b4fc-a214ea167849';
UPDATE public.trades SET default_labor_cost_code_id = '583a59f4-a722-4c1d-aa6c-00f312d35e89', default_sub_cost_code_id = 'b500170e-0c2f-4ca9-9eea-3383941aff04' WHERE id = 'c0410c73-169a-406b-999b-4f3017b4e1f8';
UPDATE public.trades SET default_labor_cost_code_id = '83e28153-9e06-4398-8ca2-eb98f8694785', default_sub_cost_code_id = 'ba661c37-67b4-4b22-a2be-3607ee68d011' WHERE id = '970ddbda-fb86-48c8-8df4-75cdebb7bb2b';
UPDATE public.trades SET default_labor_cost_code_id = 'a4bb517e-d100-4035-ab8d-3e51832564ff', default_sub_cost_code_id = 'dd16aaf1-f10a-442b-ba65-5ced8e73c2e6' WHERE id = 'fb8d3e74-99a6-4c6f-840f-c783c01951cb';
UPDATE public.trades SET default_labor_cost_code_id = '442655fc-fd22-4e5c-aaeb-44bb54ec7935', default_sub_cost_code_id = '511023ab-c4e7-4355-8f36-c0efa682f92b' WHERE id = '391a7bc6-8cf5-4ff0-a383-d6306f60fad7';
UPDATE public.trades SET default_labor_cost_code_id = 'c513c676-8d79-4661-876d-18cf3410663c', default_sub_cost_code_id = '6a392c95-d4ac-4122-9618-a52b1da42f37' WHERE id = '420002b2-7c3b-4e13-a3a2-c83929c4f7e3';
UPDATE public.trades SET default_labor_cost_code_id = '7375de06-173c-4b25-bef1-3093393b798a', default_sub_cost_code_id = 'b8656365-e5fa-5075-be93-f4f595048b3c' WHERE id = '36ff62c8-0bec-4773-aca8-af8c52a664ca';
UPDATE public.trades SET default_labor_cost_code_id = 'efc1a225-afef-40cc-b0ef-18e97f3c9dcf', default_sub_cost_code_id = '8d474ff8-3472-4f69-b675-ec8e2563b922' WHERE id = 'ca3057fd-50ab-44c0-965c-6ebff26b45ed';
UPDATE public.trades SET default_labor_cost_code_id = '328cde72-5de4-4f69-b97f-5aef06ce975b', default_sub_cost_code_id = '1ddce923-be39-4e94-acb8-2d608e0d1e08' WHERE id = '1a79f182-968d-4ea7-81b9-813b53abb300';
UPDATE public.trades SET default_labor_cost_code_id = '2a6ede5b-36bc-4f24-95d5-3c8ec332536f', default_sub_cost_code_id = 'a851b435-e2c0-4f82-99e3-27c85c922842' WHERE id = '80cd60ae-98c8-42ad-8bf1-094ac1e68a59';
UPDATE public.trades SET default_labor_cost_code_id = '6f1fd231-a6de-4a9d-acfb-81bd50199802', default_sub_cost_code_id = 'd496c7c3-a2ec-4e1c-8524-309c4fe9831e' WHERE id = '57852661-46ac-4ee1-b201-e2009bcdf6b5';
UPDATE public.trades SET default_labor_cost_code_id = 'c7d875a1-8e64-46c6-b753-639ac1b9971d', default_sub_cost_code_id = '25ca7e3a-b836-4583-bf82-f62bb1f3b040' WHERE id = '592d3b8d-062c-403f-b533-85496f8e1d72';
UPDATE public.trades SET default_labor_cost_code_id = '4641f679-de8d-44cd-9ef1-b7941d52cff3', default_sub_cost_code_id = '872d12d1-a7bd-4691-a8cf-87dac25c8b30' WHERE id = '6519c85e-13d7-4b55-aeaf-5d7a6dddca85';
UPDATE public.trades SET default_labor_cost_code_id = 'd691b110-ab11-4dd5-b457-0e6af723208c', default_sub_cost_code_id = 'd1887bc8-e434-439b-b406-2d4587952f9e' WHERE id = 'e209539c-3051-4bb9-b160-b76de9ed59a5';
UPDATE public.trades SET default_labor_cost_code_id = '4fe86482-3126-491e-ae2b-24e6d598b343', default_sub_cost_code_id = '9ac1e73f-fe7c-4227-acf9-82065fbeb379' WHERE id = '035be548-b76f-4f07-ab80-655ac7040136';
UPDATE public.trades SET default_labor_cost_code_id = '18fe5d70-1df0-4c63-868e-bc6a46513058', default_sub_cost_code_id = '8aeaf4d4-e6fb-4abe-b578-e55627e6bf34' WHERE id = 'ef72fce6-5356-4cc2-b52e-c8c1bbe67220';
UPDATE public.trades SET default_labor_cost_code_id = '3a107f92-3f12-6e85-a8a0-de8c68735270', default_sub_cost_code_id = '5c329114-5134-80a7-cac2-f0ae8a957492' WHERE id = '7e5fa65f-c1e0-4b48-9a74-a0b88f1d4b1c';
UPDATE public.trades SET default_labor_cost_code_id = '6d43a225-6245-91b8-dbd3-01bf9b068503', default_sub_cost_code_id = '8f65c447-8467-b3da-fdf5-23d1bd28a725' WHERE id = '0ad49c2c-89c9-40f3-95aa-3a4c0a5e8b7d';
UPDATE public.trades SET default_labor_cost_code_id = '9076d558-9578-c4eb-0e06-34e2ce39b836', default_sub_cost_code_id = 'b298f77a-b79a-e60d-2028-560e0e5bd058' WHERE id = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
UPDATE public.trades SET default_labor_cost_code_id = 'c3a9088b-c8ab-f71e-3139-671f1f6ce169', default_sub_cost_code_id = 'e5cb2aad-eacd-193f-5351-893131e80f8b' WHERE id = 'c7d8e9f0-1234-5678-9abc-def012345678';
UPDATE public.trades SET default_labor_cost_code_id = 'f6dc3bbe-fbde-2a40-6462-9a4242f9109c', default_sub_cost_code_id = '18fe5dd0-1df0-4c62-8684-bc6464fb32be' WHERE id = '09876543-21fe-dcba-9876-543210fedcba';
UPDATE public.trades SET default_labor_cost_code_id = '290f6ee1-2e01-5d73-9795-cd75750c43cf', default_sub_cost_code_id = '4b2181f3-4023-7f95-b9b7-ef97972e65e1' WHERE id = 'fedcba98-7654-3210-fedc-ba9876543210';
UPDATE public.trades SET default_labor_cost_code_id = '5c329204-5134-80a6-cac8-f0a8a83f76f2', default_sub_cost_code_id = '7e54b426-7356-a2c8-ece0-12c0ca519804' WHERE id = 'abcd1234-5678-90ab-cdef-1234567890ab';
UPDATE public.trades SET default_labor_cost_code_id = '8f65c537-8467-b3d9-fdf1-23d1dd62a915', default_sub_cost_code_id = 'a187e759-a689-d5fb-1f13-45f3ff84cb37' WHERE id = '12345678-90ab-cdef-1234-567890abcdef';

-- =====================================================
-- END OF DATA DUMP
-- =====================================================
