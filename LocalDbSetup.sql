CREATE USER 'deployment'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sadde';
GRANT ALL PRIVILEGES ON *.* TO 'deployment'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;