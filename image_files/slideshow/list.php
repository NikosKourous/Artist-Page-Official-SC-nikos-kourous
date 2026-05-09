<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dir = __DIR__;
$images = glob($dir . '/*.{jpg,jpeg,JPG,JPEG,png,PNG}', GLOB_BRACE);

$urls = array_map(function($path) {
    return '/image_files/slideshow/' . basename($path);
}, $images);

echo json_encode(array_values($urls));
?>
