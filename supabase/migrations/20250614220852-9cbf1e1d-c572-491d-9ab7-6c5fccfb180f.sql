
-- السماح لجميع المستخدمين بقراءة كل الزبائن (لأغراض الإدارة)
CREATE POLICY "Allow admin (and everyone) to select all customers"
  ON public.customers
  FOR SELECT
  USING (true);
