-- Smart migration: Create or link 3 default cost codes for each trade
DO $$
DECLARE
  trade_record RECORD;
  labor_code_id UUID;
  material_code_id UUID;
  sub_code_id UUID;
  base_code TEXT;
  counter INT;
  unique_code TEXT;
BEGIN
  FOR trade_record IN SELECT * FROM trades WHERE 
    default_labor_cost_code_id IS NULL OR 
    default_material_cost_code_id IS NULL OR 
    default_sub_cost_code_id IS NULL
  LOOP
    base_code := UPPER(LEFT(trade_record.name, 3));
    
    -- Handle Labor cost code
    IF trade_record.default_labor_cost_code_id IS NULL THEN
      -- Try to find existing matching code
      SELECT id INTO labor_code_id FROM cost_codes 
      WHERE category = 'labor' 
        AND trade_id = trade_record.id
        AND name LIKE trade_record.name || ' Labor'
      LIMIT 1;
      
      IF labor_code_id IS NULL THEN
        -- Generate unique code
        counter := 0;
        unique_code := base_code || '-L';
        WHILE EXISTS (SELECT 1 FROM cost_codes WHERE code = unique_code) LOOP
          counter := counter + 1;
          unique_code := base_code || counter || '-L';
        END LOOP;
        
        INSERT INTO cost_codes (code, name, category, trade_id, is_active)
        VALUES (unique_code, trade_record.name || ' Labor', 'labor', trade_record.id, true)
        RETURNING id INTO labor_code_id;
      END IF;
      
      UPDATE trades SET default_labor_cost_code_id = labor_code_id WHERE id = trade_record.id;
    END IF;
    
    -- Handle Material cost code
    IF trade_record.default_material_cost_code_id IS NULL THEN
      SELECT id INTO material_code_id FROM cost_codes 
      WHERE category = 'materials' 
        AND trade_id = trade_record.id
        AND name LIKE trade_record.name || ' Material'
      LIMIT 1;
      
      IF material_code_id IS NULL THEN
        counter := 0;
        unique_code := base_code || '-M';
        WHILE EXISTS (SELECT 1 FROM cost_codes WHERE code = unique_code) LOOP
          counter := counter + 1;
          unique_code := base_code || counter || '-M';
        END LOOP;
        
        INSERT INTO cost_codes (code, name, category, trade_id, is_active)
        VALUES (unique_code, trade_record.name || ' Material', 'materials', trade_record.id, true)
        RETURNING id INTO material_code_id;
      END IF;
      
      UPDATE trades SET default_material_cost_code_id = material_code_id WHERE id = trade_record.id;
    END IF;
    
    -- Handle Sub cost code
    IF trade_record.default_sub_cost_code_id IS NULL THEN
      SELECT id INTO sub_code_id FROM cost_codes 
      WHERE category = 'subs' 
        AND trade_id = trade_record.id
        AND name LIKE trade_record.name || ' Sub'
      LIMIT 1;
      
      IF sub_code_id IS NULL THEN
        counter := 0;
        unique_code := base_code || '-S';
        WHILE EXISTS (SELECT 1 FROM cost_codes WHERE code = unique_code) LOOP
          counter := counter + 1;
          unique_code := base_code || counter || '-S';
        END LOOP;
        
        INSERT INTO cost_codes (code, name, category, trade_id, is_active)
        VALUES (unique_code, trade_record.name || ' Sub', 'subs', trade_record.id, true)
        RETURNING id INTO sub_code_id;
      END IF;
      
      UPDATE trades SET default_sub_cost_code_id = sub_code_id WHERE id = trade_record.id;
    END IF;
  END LOOP;
END $$;