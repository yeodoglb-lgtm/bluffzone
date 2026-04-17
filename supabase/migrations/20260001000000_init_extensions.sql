-- extensions
create extension if not exists "uuid-ossp";
create extension if not exists "earthdistance" cascade;  -- places 거리 계산용
create extension if not exists "pg_trgm";                 -- 장소 검색 trigram 인덱스용
