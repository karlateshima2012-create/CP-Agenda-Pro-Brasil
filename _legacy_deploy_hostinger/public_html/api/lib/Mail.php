<?php

class Mail {
    public static function send($to, $subject, $body) {
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: CP Agenda Pro <noreply@creativeprintjp.com>' . "\r\n";
        
        // Try to send
        return mail($to, $subject, $body, $headers);
    }
}
