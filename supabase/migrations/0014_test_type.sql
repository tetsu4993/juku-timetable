-- 疑似テストの種類（総合・文法・単語など）
alter table generated_tests add column test_type text not null default 'general';
