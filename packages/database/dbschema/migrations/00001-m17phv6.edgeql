CREATE MIGRATION m17phv6jfolxnun4pw7v6kmvvazztebut5awom6ys3pkzo6igfgi2a
    ONTO initial
{
  CREATE ABSTRACT TYPE default::Base {
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
          SET readonly := true;
      };
      CREATE REQUIRED PROPERTY updated_at: std::datetime {
          SET default := (std::datetime_current());
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
          CREATE REWRITE
              UPDATE 
              USING (std::datetime_of_statement());
      };
  };
  CREATE TYPE default::User EXTENDING default::Base {
      CREATE REQUIRED PROPERTY discord_id: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY last_good_morning: std::datetime;
      CREATE REQUIRED PROPERTY last_good_night: std::datetime;
      CREATE REQUIRED PROPERTY points: std::int64 {
          SET default := 0;
      };
      CREATE REQUIRED PROPERTY streak: std::int64 {
          SET default := 0;
      };
  };
};
