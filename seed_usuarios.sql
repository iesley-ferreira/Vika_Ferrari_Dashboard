-- ============================================================
-- HBS PERFORMANCE DASHBOARD — SEED DE USUÁRIAS E RELATÓRIOS
-- 5 usuárias Produto + 6 usuárias Comercial
-- 30 dias de relatórios (dias úteis)
-- Senha padrão de todas: Senha@123
-- ============================================================

DO $$
DECLARE
  -- ── IDs das usuárias ─────────────────────────────────────
  -- Produto
  u_ana       uuid := gen_random_uuid();
  u_camila    uuid := gen_random_uuid();
  u_fernanda  uuid := gen_random_uuid();
  u_juliana   uuid := gen_random_uuid();
  u_mariana   uuid := gen_random_uuid();
  -- Comercial
  u_bruna     uuid := gen_random_uuid();
  u_carolina  uuid := gen_random_uuid();
  u_daniela   uuid := gen_random_uuid();
  u_isabela   uuid := gen_random_uuid();
  u_larissa   uuid := gen_random_uuid();
  u_patricia  uuid := gen_random_uuid();

  -- Variáveis de loop
  i   int;
  d   date;

  -- Produto
  at_flw int; at_vtl int; at_spr int; at_tot int;
  re_flw int; re_vtl int; re_spr int; re_tot int;
  tmr_h int;  tmr_m int;
  bloc  int;  clar   int;

  -- SDR
  ab_tot  int;
  ag_vtl  int; ag_flw  int; ag_out int;
  cp_flw  int; cp_vtl  int; cp_amht int; cp_out int; cp_tot int;

  -- Seller
  sl_fup    int; sl_con   int; sl_out  int; sl_cross int;
  sl_ag_vtl int; sl_ag_flw int;
  sl_cp_flw int; sl_cp_vtl int; sl_cp_amht int; sl_cp_out int; sl_cp_tot int;

  -- Closer
  cl_ag_vtl int; cl_ag_flw int; cl_ag_amht int; cl_ag_ind int;
  cl_rl_vtl int; cl_rl_flw int; cl_rl_amht int; cl_rl_ind int;
  vd_flw    int; vd_vtl   int; vd_amht   int;
  fat       numeric; csh numeric;

  -- Textos de reflexão (7 variações, rotacionadas por dia)
  txt_certo text[] := ARRAY[
    'Bati a meta de atendimentos do dia',
    'Time alinhado, boa produtividade geral',
    'Resolvi todos os tickets em aberto',
    'Excelente feedback do cliente',
    'Meta de calls superada hoje',
    'Contatos capturados acima do esperado',
    'Pipeline organizado e CRM atualizado'
  ];
  txt_melhorar text[] := ARRAY[
    'Reduzir TMR nos picos de demanda',
    'Documentar os blockers com mais detalhes',
    'Aumentar conversão nas calls de abertura',
    'Follow-up mais rápido após agendamento',
    'Manter CRM atualizado em tempo real',
    'Priorizar tickets de maior impacto',
    'Comunicação proativa com o time'
  ];
  txt_amanha text[] := ARRAY[
    'Revisar pipeline e atualizar CRM',
    'Acompanhar tickets abertos da semana',
    'Reunião de alinhamento com a gestora',
    'Prospecção de novos contatos FLW',
    'Follow-up com leads quentes da semana',
    'Fechar relatório e enviar para a gestora',
    'Apoiar treinamento interno do time'
  ];

BEGIN

  -- ============================================================
  -- 1. CRIAR USUÁRIAS EM auth.users
  --    O trigger on_auth_user_created cria os profiles
  --    automaticamente a partir de raw_user_meta_data.
  -- ============================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES

  -- ── PRODUTO ──────────────────────────────────────────────
  (u_ana,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ana.beatriz@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ana Beatriz Santos","area":"produto","role":"especialista"}',
   now(), now()),

  (u_camila,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'camila.rodrigues@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Camila Rodrigues","area":"produto","role":"especialista"}',
   now(), now()),

  (u_fernanda,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'fernanda.lima@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Fernanda Lima","area":"produto","role":"especialista"}',
   now(), now()),

  (u_juliana,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'juliana.costa@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Juliana Costa","area":"produto","role":"especialista"}',
   now(), now()),

  (u_mariana,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'mariana.oliveira@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Mariana Oliveira","area":"produto","role":"gestora_produto"}',
   now(), now()),

  -- ── COMERCIAL ────────────────────────────────────────────
  (u_bruna,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'bruna.alves@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Bruna Alves","area":"comercial","role":"sdr"}',
   now(), now()),

  (u_carolina,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carolina.mendes@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Carolina Mendes","area":"comercial","role":"sdr"}',
   now(), now()),

  (u_daniela,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'daniela.ferreira@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Daniela Ferreira","area":"comercial","role":"seller"}',
   now(), now()),

  (u_isabela,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'isabela.nascimento@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Isabela Nascimento","area":"comercial","role":"seller"}',
   now(), now()),

  (u_larissa,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'larissa.souza@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Larissa Souza","area":"comercial","role":"closer"}',
   now(), now()),

  (u_patricia,
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'patricia.carvalho@hbs.com', crypt('Senha@123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Patrícia Carvalho","area":"comercial","role":"closer"}',
   now(), now());

  -- ============================================================
  -- 2. ADICIONAR AVATAR DICEBEAR NOS PROFILES
  --    O trigger já criou os profiles; só falta avatar_url.
  -- ============================================================
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ana%20Beatriz%20Santos'   WHERE id = u_ana;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Camila%20Rodrigues'       WHERE id = u_camila;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Fernanda%20Lima'          WHERE id = u_fernanda;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Juliana%20Costa'          WHERE id = u_juliana;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Mariana%20Oliveira'       WHERE id = u_mariana;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Bruna%20Alves'            WHERE id = u_bruna;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Carolina%20Mendes'        WHERE id = u_carolina;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Daniela%20Ferreira'       WHERE id = u_daniela;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Isabela%20Nascimento'     WHERE id = u_isabela;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Larissa%20Souza'          WHERE id = u_larissa;
  UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Patr%C3%ADcia%20Carvalho' WHERE id = u_patricia;

  -- ============================================================
  -- 3. GERAR RELATÓRIOS — 30 dias regressivos (pula sáb/dom)
  --    Cada usuária tem perfis de desempenho distintos.
  -- ============================================================
  FOR d IN
  SELECT gs::date
  FROM generate_series(
    date_trunc('month', CURRENT_DATE - interval '1 month')::date, -- 1º dia do mês passado
    CURRENT_DATE,                                                  -- hoje
    interval '1 day'
  ) AS gs
LOOP
  CONTINUE WHEN EXTRACT(DOW FROM d) IN (0, 6); -- mantém só dias úteis

    -- ──────────────────────────────────────────────────
    -- ANA BEATRIZ — especialista produto (alta performance)
    -- ──────────────────────────────────────────────────
    at_flw := (random()*9 + 6)::int;
    at_vtl := (random()*5 + 3)::int;
    at_spr := (random()*4 + 2)::int;
    at_tot := at_flw + at_vtl + at_spr;
    re_flw := greatest(0, at_flw - (random()*1)::int);
    re_vtl := at_vtl;
    re_spr := at_spr;
    re_tot := re_flw + re_vtl + re_spr;
    tmr_h  := (random()*1)::int;
    tmr_m  := (random()*50 + 5)::int;
    bloc   := (random()*1)::int;
    clar   := (random()*1)::int;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_ana, d, 'produto', 'especialista', jsonb_build_object(
      'atendimentos',          jsonb_build_object('flw', at_flw, 'vtl_amht_outros', at_vtl, 'sprint', at_spr),
      'atendimentos_total',    at_tot,
      'resolvidos',            jsonb_build_object('flw', re_flw, 'vtl_amht_outros', re_vtl, 'sprint', re_spr),
      'resolvidos_total',      re_tot,
      'nao_sei_o_que_fazer',   bloc,
      'falta_clareza_qtd',     clar,
      'tempo_medio_resposta_horas',   tmr_h,
      'tempo_medio_resposta_minutos', tmr_m,
      'deu_certo',        txt_certo[1 + (i % 7)],
      'a_melhorar',       txt_melhorar[1 + ((i + 1) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 2) % 7)]
    ), d + interval '17 hours')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- CAMILA — especialista produto (performance média-alta)
    -- ──────────────────────────────────────────────────
    at_flw := (random()*7 + 4)::int;
    at_vtl := (random()*6 + 3)::int;
    at_spr := (random()*3 + 1)::int;
    at_tot := at_flw + at_vtl + at_spr;
    re_flw := greatest(0, at_flw - (random()*2)::int);
    re_vtl := greatest(0, at_vtl - (random()*1)::int);
    re_spr := at_spr;
    re_tot := re_flw + re_vtl + re_spr;
    tmr_h  := (random()*2)::int;
    tmr_m  := (random()*55)::int;
    bloc   := (random()*2)::int;
    clar   := (random()*2)::int;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_camila, d, 'produto', 'especialista', jsonb_build_object(
      'atendimentos',          jsonb_build_object('flw', at_flw, 'vtl_amht_outros', at_vtl, 'sprint', at_spr),
      'atendimentos_total',    at_tot,
      'resolvidos',            jsonb_build_object('flw', re_flw, 'vtl_amht_outros', re_vtl, 'sprint', re_spr),
      'resolvidos_total',      re_tot,
      'nao_sei_o_que_fazer',   bloc,
      'falta_clareza_qtd',     clar,
      'tempo_medio_resposta_horas',   tmr_h,
      'tempo_medio_resposta_minutos', tmr_m,
      'deu_certo',        txt_certo[1 + ((i + 2) % 7)],
      'a_melhorar',       txt_melhorar[1 + ((i + 3) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 4) % 7)]
    ), d + interval '17 hours 30 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- FERNANDA — especialista produto (alto volume)
    -- ──────────────────────────────────────────────────
    at_flw := (random()*10 + 7)::int;
    at_vtl := (random()*4  + 2)::int;
    at_spr := (random()*5  + 2)::int;
    at_tot := at_flw + at_vtl + at_spr;
    re_flw := greatest(0, at_flw - (random()*2)::int);
    re_vtl := at_vtl;
    re_spr := greatest(0, at_spr - (random()*2)::int);
    re_tot := re_flw + re_vtl + re_spr;
    tmr_h  := (random()*2)::int;
    tmr_m  := (random()*40 + 10)::int;
    bloc   := (random()*2)::int;
    clar   := (random()*1)::int;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_fernanda, d, 'produto', 'especialista', jsonb_build_object(
      'atendimentos',          jsonb_build_object('flw', at_flw, 'vtl_amht_outros', at_vtl, 'sprint', at_spr),
      'atendimentos_total',    at_tot,
      'resolvidos',            jsonb_build_object('flw', re_flw, 'vtl_amht_outros', re_vtl, 'sprint', re_spr),
      'resolvidos_total',      re_tot,
      'nao_sei_o_que_fazer',   bloc,
      'falta_clareza_qtd',     clar,
      'tempo_medio_resposta_horas',   tmr_h,
      'tempo_medio_resposta_minutos', tmr_m,
      'deu_certo',        txt_certo[1 + ((i + 4) % 7)],
      'a_melhorar',       txt_melhorar[1 + ((i + 5) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 6) % 7)]
    ), d + interval '18 hours')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- JULIANA — especialista produto (em desenvolvimento)
    -- ──────────────────────────────────────────────────
    at_flw := (random()*7 + 3)::int;
    at_vtl := (random()*5 + 2)::int;
    at_spr := (random()*3 + 1)::int;
    at_tot := at_flw + at_vtl + at_spr;
    re_flw := greatest(0, at_flw - (random()*3)::int);
    re_vtl := greatest(0, at_vtl - (random()*2)::int);
    re_spr := greatest(0, at_spr - (random()*1)::int);
    re_tot := re_flw + re_vtl + re_spr;
    tmr_h  := (random()*3 + 1)::int;
    tmr_m  := (random()*55)::int;
    bloc   := (random()*3)::int;
    clar   := (random()*3)::int;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_juliana, d, 'produto', 'especialista', jsonb_build_object(
      'atendimentos',          jsonb_build_object('flw', at_flw, 'vtl_amht_outros', at_vtl, 'sprint', at_spr),
      'atendimentos_total',    at_tot,
      'resolvidos',            jsonb_build_object('flw', re_flw, 'vtl_amht_outros', re_vtl, 'sprint', re_spr),
      'resolvidos_total',      re_tot,
      'nao_sei_o_que_fazer',   bloc,
      'falta_clareza_qtd',     clar,
      'tempo_medio_resposta_horas',   tmr_h,
      'tempo_medio_resposta_minutos', tmr_m,
      'deu_certo',        txt_certo[1 + ((i + 1) % 7)],
      'a_melhorar',       txt_melhorar[1 + ((i + 2) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 3) % 7)]
    ), d + interval '17 hours 45 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- MARIANA — gestora_produto (poucos tickets, TMR excelente)
    -- ──────────────────────────────────────────────────
    at_flw := (random()*4 + 2)::int;
    at_vtl := (random()*3 + 1)::int;
    at_spr := (random()*3 + 1)::int;
    at_tot := at_flw + at_vtl + at_spr;
    re_flw := at_flw;
    re_vtl := at_vtl;
    re_spr := at_spr;
    re_tot := re_flw + re_vtl + re_spr;
    tmr_h  := 0;
    tmr_m  := (random()*40 + 5)::int;
    bloc   := (random()*1)::int;
    clar   := 0;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_mariana, d, 'produto', 'gestora_produto', jsonb_build_object(
      'atendimentos',          jsonb_build_object('flw', at_flw, 'vtl_amht_outros', at_vtl, 'sprint', at_spr),
      'atendimentos_total',    at_tot,
      'resolvidos',            jsonb_build_object('flw', re_flw, 'vtl_amht_outros', re_vtl, 'sprint', re_spr),
      'resolvidos_total',      re_tot,
      'nao_sei_o_que_fazer',   bloc,
      'falta_clareza_qtd',     clar,
      'tempo_medio_resposta_horas',   tmr_h,
      'tempo_medio_resposta_minutos', tmr_m,
      'deu_certo',        txt_certo[1 + ((i + 3) % 7)],
      'a_melhorar',       txt_melhorar[1 + ((i + 4) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 5) % 7)]
    ), d + interval '18 hours 30 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- BRUNA — SDR comercial (volume alto, conversão boa)
    -- ──────────────────────────────────────────────────
    ab_tot  := (random()*60 + 55)::int;
    ag_vtl  := (random()*5 + 3)::int;
    ag_flw  := (random()*7 + 4)::int;
    ag_out  := (random()*3 + 1)::int;
    cp_flw  := (random()*10 + 6)::int;
    cp_vtl  := (random()*8  + 4)::int;
    cp_amht := (random()*5  + 2)::int;
    cp_out  := (random()*4  + 1)::int;
    cp_tot  := cp_flw + cp_vtl + cp_amht + cp_out;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_bruna, d, 'comercial', 'sdr', jsonb_build_object(
      'abordagens_total',  ab_tot,
      'abordagens_tipos',  '["FDO","HBS Talks"]'::jsonb,
      'calls_agendadas',   jsonb_build_object('vtl', ag_vtl, 'flw', ag_flw, 'outros', ag_out),
      'contatos_capturados', jsonb_build_object(
        'total', cp_tot, 'amht', cp_amht, 'vtl', cp_vtl, 'flw', cp_flw, 'outros', cp_out),
      'crm_status',   'atualizado',
      'deu_certo',    txt_certo[1 + ((i + 5) % 7)],
      'a_melhorar',   txt_melhorar[1 + ((i + 6) % 7)],
      'atividades_amanha', txt_amanha[1 + (i % 7)]
    ), d + interval '18 hours')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- CAROLINA — SDR comercial (volume médio, crescendo)
    -- ──────────────────────────────────────────────────
    ab_tot  := (random()*70 + 40)::int;
    ag_vtl  := (random()*5 + 2)::int;
    ag_flw  := (random()*8 + 3)::int;
    ag_out  := (random()*3 + 1)::int;
    cp_flw  := (random()*9  + 4)::int;
    cp_vtl  := (random()*7  + 3)::int;
    cp_amht := (random()*5  + 2)::int;
    cp_out  := (random()*3  + 1)::int;
    cp_tot  := cp_flw + cp_vtl + cp_amht + cp_out;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_carolina, d, 'comercial', 'sdr', jsonb_build_object(
      'abordagens_total',  ab_tot,
      'abordagens_tipos',  '["FDO","Outros"]'::jsonb,
      'calls_agendadas',   jsonb_build_object('vtl', ag_vtl, 'flw', ag_flw, 'outros', ag_out),
      'contatos_capturados', jsonb_build_object(
        'total', cp_tot, 'amht', cp_amht, 'vtl', cp_vtl, 'flw', cp_flw, 'outros', cp_out),
      'crm_status',   CASE WHEN i % 4 = 0 THEN 'pendente' ELSE 'atualizado' END,
      'deu_certo',    txt_certo[1 + ((i + 6) % 7)],
      'a_melhorar',   txt_melhorar[1 + (i % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 1) % 7)]
    ), d + interval '17 hours 30 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- DANIELA — Seller comercial (boa taxa de conduções)
    -- ──────────────────────────────────────────────────
    sl_fup    := (random()*10 + 5)::int;
    sl_con    := (random()*8  + 4)::int;
    sl_out    := (random()*3  + 1)::int;
    sl_cross  := (random()*3)::int;
    sl_ag_vtl := (random()*5 + 2)::int;
    sl_ag_flw := (random()*6 + 3)::int;
    sl_cp_flw  := (random()*8 + 3)::int;
    sl_cp_vtl  := (random()*6 + 2)::int;
    sl_cp_amht := (random()*4 + 1)::int;
    sl_cp_out  := (random()*3 + 1)::int;
    sl_cp_tot  := sl_cp_flw + sl_cp_vtl + sl_cp_amht + sl_cp_out;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_daniela, d, 'comercial', 'seller', jsonb_build_object(
      'abordagens',    jsonb_build_object('follow_up', sl_fup, 'conducoes', sl_con, 'outros', sl_out),
      'cross',         sl_cross,
      'calls_agendadas', jsonb_build_object('vtl', sl_ag_vtl, 'flw', sl_ag_flw),
      'contatos_capturados', jsonb_build_object(
        'total', sl_cp_tot, 'amht', sl_cp_amht, 'vtl', sl_cp_vtl, 'flw', sl_cp_flw, 'outros', sl_cp_out),
      'crm_status',   'atualizado',
      'deu_certo',    txt_certo[1 + ((i + 2) % 7)],
      'a_melhorar',   txt_melhorar[1 + ((i + 3) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 4) % 7)]
    ), d + interval '18 hours')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- ISABELA — Seller comercial (alto volume, top performer)
    -- ──────────────────────────────────────────────────
    sl_fup    := (random()*12 + 7)::int;
    sl_con    := (random()*10 + 5)::int;
    sl_out    := (random()*4  + 2)::int;
    sl_cross  := (random()*4 + 1)::int;
    sl_ag_vtl := (random()*6 + 3)::int;
    sl_ag_flw := (random()*7 + 4)::int;
    sl_cp_flw  := (random()*11 + 5)::int;
    sl_cp_vtl  := (random()*8  + 4)::int;
    sl_cp_amht := (random()*5  + 2)::int;
    sl_cp_out  := (random()*4  + 1)::int;
    sl_cp_tot  := sl_cp_flw + sl_cp_vtl + sl_cp_amht + sl_cp_out;
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_isabela, d, 'comercial', 'seller', jsonb_build_object(
      'abordagens',    jsonb_build_object('follow_up', sl_fup, 'conducoes', sl_con, 'outros', sl_out),
      'cross',         sl_cross,
      'calls_agendadas', jsonb_build_object('vtl', sl_ag_vtl, 'flw', sl_ag_flw),
      'contatos_capturados', jsonb_build_object(
        'total', sl_cp_tot, 'amht', sl_cp_amht, 'vtl', sl_cp_vtl, 'flw', sl_cp_flw, 'outros', sl_cp_out),
      'crm_status',   'atualizado',
      'deu_certo',    txt_certo[1 + ((i + 4) % 7)],
      'a_melhorar',   txt_melhorar[1 + ((i + 5) % 7)],
      'atividades_amanha', txt_amanha[1 + ((i + 6) % 7)]
    ), d + interval '17 hours 45 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- LARISSA — Closer comercial (faturamento médio)
    -- ──────────────────────────────────────────────────
    cl_ag_vtl := (random()*4 + 2)::int;
    cl_ag_flw := (random()*3 + 2)::int;
    cl_ag_amht := (random()*3 + 1)::int;
    cl_ag_ind := (random()*2 + 1)::int;
    cl_rl_vtl  := greatest(0, cl_ag_vtl  - (random()*1)::int);
    cl_rl_flw  := cl_ag_flw;
    cl_rl_amht := greatest(0, cl_ag_amht - (random()*1)::int);
    cl_rl_ind  := cl_ag_ind;
    vd_flw  := (random()*2)::int;
    vd_vtl  := (random()*2)::int;
    vd_amht := (random()*1)::int;
    fat := round((random() * 28000 + 8000)::numeric, 2);
    csh := round((fat * (0.70 + random() * 0.22))::numeric, 2);
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_larissa, d, 'comercial', 'closer', jsonb_build_object(
      'calls_agendadas',  jsonb_build_object('vtl', cl_ag_vtl,  'flw', cl_ag_flw,  'amht', cl_ag_amht,  'individual', cl_ag_ind),
      'calls_realizadas', jsonb_build_object('vtl', cl_rl_vtl,  'flw', cl_rl_flw,  'amht', cl_rl_amht,  'individual', cl_rl_ind),
      'vendas',           jsonb_build_object('flw', vd_flw, 'vtl', vd_vtl, 'amht', vd_amht),
      'faturamento_dia',  fat,
      'cash_collect_valor', csh,
      'crm_status',  'atualizado',
      'deu_certo',   txt_certo[1 + ((i + 3) % 7)],
      'a_melhorar',  txt_melhorar[1 + ((i + 4) % 7)]
    ), d + interval '18 hours 30 minutes')
    ON CONFLICT (user_id, report_date) DO NOTHING;

    -- ──────────────────────────────────────────────────
    -- PATRÍCIA — Closer comercial (top faturamento)
    -- ──────────────────────────────────────────────────
    cl_ag_vtl  := (random()*5 + 3)::int;
    cl_ag_flw  := (random()*4 + 2)::int;
    cl_ag_amht := (random()*3 + 2)::int;
    cl_ag_ind  := (random()*3 + 1)::int;
    cl_rl_vtl  := cl_ag_vtl;
    cl_rl_flw  := greatest(0, cl_ag_flw  - (random()*1)::int);
    cl_rl_amht := cl_ag_amht;
    cl_rl_ind  := greatest(0, cl_ag_ind  - (random()*1)::int);
    vd_flw  := (random()*3 + 1)::int;
    vd_vtl  := (random()*2 + 1)::int;
    vd_amht := (random()*2)::int;
    fat := round((random() * 42000 + 14000)::numeric, 2);
    csh := round((fat * (0.75 + random() * 0.20))::numeric, 2);
    INSERT INTO daily_reports (id, user_id, report_date, area, role, data, submitted_at)
    VALUES (gen_random_uuid(), u_patricia, d, 'comercial', 'closer', jsonb_build_object(
      'calls_agendadas',  jsonb_build_object('vtl', cl_ag_vtl,  'flw', cl_ag_flw,  'amht', cl_ag_amht,  'individual', cl_ag_ind),
      'calls_realizadas', jsonb_build_object('vtl', cl_rl_vtl,  'flw', cl_rl_flw,  'amht', cl_rl_amht,  'individual', cl_rl_ind),
      'vendas',           jsonb_build_object('flw', vd_flw, 'vtl', vd_vtl, 'amht', vd_amht),
      'faturamento_dia',  fat,
      'cash_collect_valor', csh,
      'crm_status',  'atualizado',
      'deu_certo',   txt_certo[1 + ((i + 6) % 7)],
      'a_melhorar',  txt_melhorar[1 + (i % 7)]
    ), d + interval '18 hours')
    ON CONFLICT (user_id, report_date) DO NOTHING;

  END LOOP;

  RAISE NOTICE '✓ 11 usuárias criadas com avatars DiceBear e relatórios dos últimos 30 dias gerados.';
END $$;


-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  p.full_name,
  p.area,
  p.role,
  p.avatar_url IS NOT NULL AS tem_avatar,
  COUNT(r.id)              AS total_relatorios
FROM public.profiles p
LEFT JOIN public.daily_reports r ON r.user_id = p.id
WHERE p.area IN ('produto', 'comercial')
GROUP BY p.full_name, p.area, p.role, p.avatar_url
ORDER BY p.area, p.role, p.full_name;
