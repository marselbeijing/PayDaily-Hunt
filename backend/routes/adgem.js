const express = require('express');
const axios = require('axios');
const router = express.Router();

const ADGEM_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNzBiNDVjZjM2YjgwYjY2NWYwMjliNGMyOTYxZjIxYWRlYTM0NWU3YTNlN2E1MGNlYWY1MjYzMTY4Y2U1YmI0OWZhYTY5YTRjNTgyNThmYWMiLCJpYXQiOjE3NTEyNTY0NTIuOTcyNzU4LCJuYmYiOjE3NTEyNTY0NTIuOTcyNzU5LCJleHAiOjE3ODI3OTI0NTIuOTY3NDUxLCJzdWIiOiIyNzkwNiIsInNjb3BlcyI6W119.eyQIRHlJbP6Cifrr539Yg1nCA8-XbY962klY8EjEJMscsLeu2PBrYBFEDXZaDGZBlG1e4Ia_chefLVNQZGVkihdmgN-KmH9X3AiwmhxDi0ZBJQhRLkJEfEZfS9q7TTVjH9m0X9CtF8CVJ0DvifuxxjWCzgqbsmwetghACNuiyje_LKDBoQf6Bgfo0u3syQs2GClkNvHLbB57N3OCcZGMsfBW-1FTjbliYHK_VbsoiSwByyj7S3W81mts4VOFD4JWXqyOLbT4mgO_r-dJIPl0ZKjsAaB6dxfjgmczx07JLnDvKWlHG161Rcca_Jn5Vmyn1yWSpmxoHfNCAc6A7LEZ_UUz9fDqJ_GfUJCcPe9zogVhEBpaTHJZJwvuE5mYMaJ4GT3uOTqL8mz1EBhPZC3OUUgw8hHgyHJsgdsxmKFIg0VzNACrpNjjGxNbkj0Pl9hHJT_aQRLofNl_e-aPiaTW4W6vjIJvcYFudkuZvIQ7YA0_EERTQxLpyvaEojxHHtOLm0KOtNmDojQHK5qaT1HrbCCJF-_h7w11XKc9AMAoIqVxHMZTd728BnjdOSiANZI7NXL-Bd2JncVtjQfKG05441H22atJKkvfCBPq2QrdTDu3rFGHdZkDwIbqmj_x3hH3vF5JxXLodWeV_w06jX6URek_u_D_pAWC24wLmHlnHN4';
const ADGEM_APP_ID = '30674';

router.get('/offers', async (req, res) => {
  try {
    const { user_id } = req.query;
    const response = await axios.get(`https://api.adgem.com/v1/wall/${ADGEM_APP_ID}/offers`, {
      params: {
        user_id,
      },
      headers: {
        Authorization: `Bearer ${ADGEM_API_KEY}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении офферов AdGem', details: error.message });
  }
});

module.exports = router; 