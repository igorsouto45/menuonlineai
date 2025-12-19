-- Add CPF/CNPJ field to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN cpf_cnpj text;