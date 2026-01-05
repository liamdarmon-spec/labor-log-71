-- Create measurement_units table with comprehensive residential construction units
DROP POLICY IF EXISTS measurement_units_select_all ON public.measurement_units;
CREATE POLICY measurement_units_select_all
    ON public.measurement_units
    FOR SELECT
    USING (true);
