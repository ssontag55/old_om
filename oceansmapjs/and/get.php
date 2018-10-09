<?php
  header('Access-Control-Allow-Origin: *');
  header("Access-COntrol-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

  echo file_get_contents($_SERVER[QUERY_STRING]);
?>
