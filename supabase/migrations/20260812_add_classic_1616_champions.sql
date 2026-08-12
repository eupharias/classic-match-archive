insert into public.champions(name)
values ('Akali'), ('Kennen'), ('Shen')
on conflict (name) do nothing;
