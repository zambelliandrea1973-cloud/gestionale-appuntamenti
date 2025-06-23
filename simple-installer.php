<?php
// Standalone installer - no WordPress dependencies
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (isset($_POST['install'])) {
    $install_dir = 'gestionale';
    $success = [];
    $errors = [];
    
    // Create installation directory
    if (!file_exists($install_dir)) {
        if (mkdir($install_dir, 0755, true)) {
            $success[] = "Directory created: $install_dir";
        } else {
            $errors[] = "Failed to create directory: $install_dir";
        }
    }
    
    // Create basic files
    $files = [
        'index.php' => '<?php
session_start();
if (!isset($_SESSION["logged"])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html>
<head><title>Gestionale</title></head>
<body>
<h1>Dashboard Gestionale</h1>
<p>Sistema attivo!</p>
<a href="logout.php">Logout</a>
</body>
</html>',
        
        'login.php' => '<?php
session_start();
if (isset($_POST["login"])) {
    if ($_POST["user"] === "admin" && $_POST["pass"] === "coverde79") {
        $_SESSION["logged"] = true;
        header("Location: index.php");
        exit;
    }
}
?>
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
<form method="post">
<p>User: <input type="text" name="user" value="admin"></p>
<p>Pass: <input type="password" name="pass" value="coverde79"></p>
<p><input type="submit" name="login" value="Login"></p>
</form>
</body>
</html>',
        
        'logout.php' => '<?php
session_start();
session_destroy();
header("Location: login.php");
?>'
    ];
    
    $created = 0;
    foreach ($files as $filename => $content) {
        $filepath = $install_dir . '/' . $filename;
        if (file_put_contents($filepath, $content)) {
            $created++;
            $success[] = "Created: $filename";
        } else {
            $errors[] = "Failed to create: $filename";
        }
    }
    
    if (empty($errors)) {
        $success[] = "Installation completed successfully!";
        $success[] = "Access: <a href='$install_dir/login.php'>$install_dir/login.php</a>";
        $success[] = "Username: admin | Password: coverde79";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Simple Installer</title>
    <style>
        body { font-family: Arial; margin: 50px; }
        .success { color: green; padding: 10px; background: #e8f5e8; }
        .error { color: red; padding: 10px; background: #ffe8e8; }
        .btn { padding: 10px 20px; background: #007cba; color: white; border: none; }
    </style>
</head>
<body>
    <h1>Gestionale Installer</h1>
    
    <?php if (isset($_POST['install'])): ?>
        <?php foreach ($success as $msg): ?>
            <div class="success"><?php echo $msg; ?></div>
        <?php endforeach; ?>
        
        <?php foreach ($errors as $msg): ?>
            <div class="error"><?php echo $msg; ?></div>
        <?php endforeach; ?>
        
        <p><a href="<?php echo $_SERVER['PHP_SELF']; ?>">Back to installer</a></p>
    <?php else: ?>
        <form method="post">
            <p>This will create a basic file-based management system.</p>
            <input type="submit" name="install" value="Install Now" class="btn">
        </form>
    <?php endif; ?>
</body>
</html>