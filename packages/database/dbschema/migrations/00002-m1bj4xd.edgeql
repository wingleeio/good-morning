CREATE MIGRATION m1bj4xdn3zgsgmlzrtmhkpgxrukl4abokvjfxnjskfwkg576tn3rqa
    ONTO m17phv6jfolxnun4pw7v6kmvvazztebut5awom6ys3pkzo6igfgi2a
{
  ALTER TYPE default::User {
      ALTER PROPERTY last_good_morning {
          RESET OPTIONALITY;
      };
      ALTER PROPERTY last_good_night {
          RESET OPTIONALITY;
      };
  };
};
