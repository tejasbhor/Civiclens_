-- Check how many officer photos exist for report #26

SELECT 
    upload_source,
    COUNT(*) as photo_count
FROM media
WHERE report_id = 26
  AND file_type = 'image'
GROUP BY upload_source;

-- See all photos for report #26
SELECT 
    id,
    file_url,
    upload_source,
    created_at
FROM media
WHERE report_id = 26
  AND file_type = 'image'
ORDER BY created_at;

-- If you need to delete some before photos to make room:
-- DELETE FROM media 
-- WHERE report_id = 26 
--   AND upload_source = 'officer_before_photo'
--   AND id IN (SELECT id FROM media WHERE report_id = 26 AND upload_source = 'officer_before_photo' ORDER BY created_at DESC LIMIT 3);
